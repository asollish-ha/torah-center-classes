"""SoundCloud integration.

SoundCloud closed public API (v1) registration for new apps years ago, so this
talks to api-v2.soundcloud.com — the same unauthenticated, public endpoint
soundcloud.com's own web player uses to read public tracks/playlists. It only
needs a non-secret `client_id` (see backend/.env.example for how to obtain
one) and only ever touches publicly visible data.
"""
from __future__ import annotations

import logging

import httpx

from ..config import settings
from ..models import ClassItem, SourceRef, SourceType
from .series_names import normalize_series_title

log = logging.getLogger(__name__)

API_BASE = "https://api-v2.soundcloud.com"


async def _get(client: httpx.AsyncClient, endpoint: str, **params) -> dict:
    params.setdefault("client_id", settings.soundcloud_client_id)
    # httpx.Client.get(url, params=...) *replaces* any query string already
    # present on `url` instead of merging with it. That's harmless for plain
    # endpoints, but `endpoint` here is often a SoundCloud `next_href` cursor
    # that already carries its own `offset`/`limit` query params — passing
    # those through `params=` would silently strip them, causing SoundCloud
    # to fall back to a tiny default page and re-serve the first page over
    # and over (which then trips the pagination loop guard after ~200
    # tracks instead of walking the full multi-thousand-track catalog).
    # `copy_merge_params` merges instead of overwriting, so both the
    # existing cursor and client_id survive.
    url = httpx.URL(endpoint).copy_merge_params(params)
    resp = await client.get(url)
    resp.raise_for_status()
    return resp.json()


async def _paginate(client: httpx.AsyncClient, endpoint: str, **params) -> list[dict]:
    items: list[dict] = []
    next_url: str | None = endpoint
    next_params = params
    seen_urls: set[str] = set()
    while next_url and next_url not in seen_urls:
        seen_urls.add(next_url)
        data = await _get(client, next_url, **next_params)
        collection = data.get("collection", [])
        if not collection:
            break
        items.extend(collection)
        next_url = data.get("next_href")
        next_params = {}  # next_href already carries the query string
    return items


async def _resolve_user_id(client: httpx.AsyncClient, username: str) -> int:
    data = await _get(
        client, f"{API_BASE}/resolve", url=f"https://soundcloud.com/{username}"
    )
    if data.get("kind") != "user":
        raise ValueError(f"{username!r} did not resolve to a SoundCloud user")
    return data["id"]


def _artwork(track_or_playlist: dict) -> str | None:
    art = track_or_playlist.get("artwork_url")
    if art:
        return art.replace("-large", "-t500x500")
    user_art = (track_or_playlist.get("user") or {}).get("avatar_url")
    return user_art


async def fetch_soundcloud_classes() -> list[ClassItem]:
    if not settings.soundcloud_enabled:
        log.info("SoundCloud not configured (missing client_id or username) — skipping.")
        return []

    async with httpx.AsyncClient(timeout=30) as client:
        user_id = await _resolve_user_id(client, settings.soundcloud_username)

        tracks = await _paginate(
            client, f"{API_BASE}/users/{user_id}/tracks", limit=200
        )
        playlists = await _paginate(
            client, f"{API_BASE}/users/{user_id}/playlists", limit=200
        )

        track_id_to_series: dict[int, set[str]] = {}
        for playlist in playlists:
            title = normalize_series_title(playlist.get("title", ""))
            playlist_tracks = playlist.get("tracks", [])
            # The playlists listing sometimes truncates the track array —
            # re-fetch the full playlist when that happens.
            if playlist.get("track_count", 0) > len(playlist_tracks):
                try:
                    full = await _get(client, f"{API_BASE}/playlists/{playlist['id']}")
                    playlist_tracks = full.get("tracks", playlist_tracks)
                except httpx.HTTPStatusError as exc:
                    log.warning("Failed to fetch full playlist %s: %s", title, exc)
            for track in playlist_tracks:
                track_id = track.get("id")
                if track_id is not None:
                    track_id_to_series.setdefault(track_id, set()).add(title)

    classes: list[ClassItem] = []
    for track in tracks:
        if track.get("kind") != "track" or track.get("public", True) is False:
            continue
        track_id = track["id"]
        duration_sec = int(track.get("full_duration", track.get("duration", 0)) / 1000)
        series = sorted(track_id_to_series.get(track_id, set()))
        classes.append(
            ClassItem(
                id=f"sc-{track_id}",
                title=track.get("title", "Untitled"),
                description=track.get("description") or "",
                published_at=track.get("created_at") or track.get("display_date"),
                thumbnail=_artwork(track),
                series=series,
                types=[SourceType.audio],
                sources=[
                    SourceRef(
                        type=SourceType.audio,
                        id=str(track_id),
                        url=track.get("permalink_url", ""),
                        embed_url=(
                            "https://w.soundcloud.com/player/?url="
                            f"{track.get('permalink_url', '')}"
                        ),
                        duration_sec=duration_sec,
                        thumbnail=_artwork(track),
                    )
                ],
            )
        )
    return classes
