"""YouTube Data API v3 integration.

Pulls every public video uploaded to a channel plus every playlist the channel
owns, then builds a video_id -> [playlist titles] map so each video can be
auto-tagged with the series (playlist) it belongs to.
"""
from __future__ import annotations

import logging

import httpx

from ..config import settings
from ..models import ClassItem, SourceRef, SourceType
from .series_names import normalize_series_title

log = logging.getLogger(__name__)

API_BASE = "https://www.googleapis.com/youtube/v3"


async def _get(client: httpx.AsyncClient, path: str, **params) -> dict:
    params["key"] = settings.youtube_api_key
    resp = await client.get(f"{API_BASE}/{path}", params=params)
    resp.raise_for_status()
    return resp.json()


async def _uploads_playlist_id(client: httpx.AsyncClient, channel_id: str) -> str:
    data = await _get(
        client, "channels", part="contentDetails", id=channel_id
    )
    items = data.get("items", [])
    if not items:
        raise ValueError(f"No YouTube channel found for id={channel_id!r}")
    return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]


async def _all_playlist_items(
    client: httpx.AsyncClient, playlist_id: str, part: str = "snippet,contentDetails"
) -> list[dict]:
    items: list[dict] = []
    page_token: str | None = None
    while True:
        params = {"part": part, "playlistId": playlist_id, "maxResults": 50}
        if page_token:
            params["pageToken"] = page_token
        data = await _get(client, "playlistItems", **params)
        items.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return items


async def _channel_playlists(client: httpx.AsyncClient, channel_id: str) -> list[dict]:
    playlists: list[dict] = []
    page_token: str | None = None
    while True:
        params = {"part": "snippet", "channelId": channel_id, "maxResults": 50}
        if page_token:
            params["pageToken"] = page_token
        data = await _get(client, "playlists", **params)
        playlists.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return playlists


def _best_thumbnail(thumbnails: dict) -> str | None:
    for size in ("maxres", "standard", "high", "medium", "default"):
        thumb = thumbnails.get(size)
        if thumb:
            return thumb["url"]
    return None


async def fetch_youtube_classes() -> list[ClassItem]:
    if not settings.youtube_enabled:
        log.info("YouTube not configured (missing API key or channel id) — skipping.")
        return []

    channel_id = settings.youtube_channel_id
    async with httpx.AsyncClient(timeout=30) as client:
        uploads_playlist_id = await _uploads_playlist_id(client, channel_id)
        uploaded_items = await _all_playlist_items(client, uploads_playlist_id)
        playlists = await _channel_playlists(client, channel_id)

        # Skip the auto-generated "uploads" playlist itself as a series tag.
        taggable_playlists = [
            p for p in playlists if p["id"] != uploads_playlist_id
        ]

        video_id_to_series: dict[str, set[str]] = {}
        for playlist in taggable_playlists:
            title = normalize_series_title(playlist["snippet"]["title"])
            try:
                items = await _all_playlist_items(client, playlist["id"], part="contentDetails")
            except httpx.HTTPStatusError as exc:
                log.warning("Failed to fetch playlist %s: %s", title, exc)
                continue
            for item in items:
                video_id = item["contentDetails"]["videoId"]
                video_id_to_series.setdefault(video_id, set()).add(title)

    classes: list[ClassItem] = []
    for item in uploaded_items:
        snippet = item["snippet"]
        video_id = snippet["resourceId"]["videoId"]
        # Deleted/private videos show up as "Private video" / "Deleted video".
        if snippet.get("title") in ("Private video", "Deleted video"):
            continue
        series = sorted(video_id_to_series.get(video_id, set()))
        classes.append(
            ClassItem(
                id=f"yt-{video_id}",
                title=snippet["title"],
                description=snippet.get("description", ""),
                published_at=snippet["publishedAt"],
                thumbnail=_best_thumbnail(snippet.get("thumbnails", {})),
                series=series,
                types=[SourceType.video],
                sources=[
                    SourceRef(
                        type=SourceType.video,
                        id=video_id,
                        url=f"https://www.youtube.com/watch?v={video_id}",
                        embed_url=f"https://www.youtube.com/embed/{video_id}",
                        thumbnail=_best_thumbnail(snippet.get("thumbnails", {})),
                    )
                ],
            )
        )
    return classes
