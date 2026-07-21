"""Merges YouTube and SoundCloud entries that represent the same shiur.

Two entries are treated as the same class when their titles are a close fuzzy
match AND their publish dates are within a few days of each other (accounts
for a video being uploaded a day or two before/after its audio counterpart).
"""
from __future__ import annotations

import re
from datetime import timedelta

from rapidfuzz import fuzz

from ..models import ClassItem

TITLE_MATCH_THRESHOLD = 88
DATE_WINDOW = timedelta(days=3)

_PUNCT_RE = re.compile(r"[^\w\s]")
_WS_RE = re.compile(r"\s+")


def _normalize_title(title: str) -> str:
    title = title.lower()
    title = _PUNCT_RE.sub(" ", title)
    title = _WS_RE.sub(" ", title).strip()
    return title


def merge_classes(youtube_classes: list[ClassItem], soundcloud_classes: list[ClassItem]) -> list[ClassItem]:
    merged: list[ClassItem] = list(youtube_classes)
    unmatched_audio: list[ClassItem] = []

    for audio_item in soundcloud_classes:
        audio_title = _normalize_title(audio_item.title)
        match: ClassItem | None = None
        best_score = 0.0

        for video_item in merged:
            if video_item.published_at is None or audio_item.published_at is None:
                continue
            if abs(video_item.published_at - audio_item.published_at) > DATE_WINDOW:
                continue
            score = fuzz.token_sort_ratio(audio_title, _normalize_title(video_item.title))
            if score >= TITLE_MATCH_THRESHOLD and score > best_score:
                match = video_item
                best_score = score

        if match is not None:
            match.sources.extend(audio_item.sources)
            match.types = sorted(set(match.types) | set(audio_item.types), key=lambda t: t.value)
            match.series = sorted(set(match.series) | set(audio_item.series))
            # Prefer the YouTube thumbnail (a real video frame) over the
            # SoundCloud artwork for classes that have both — SoundCloud
            # artwork is often just a candid photo of the teacher rather than
            # a proper thumbnail, so it should only fill in when there's no
            # YouTube thumbnail to show at all (audio-only classes).
            if not match.thumbnail and audio_item.thumbnail:
                match.thumbnail = audio_item.thumbnail
        else:
            unmatched_audio.append(audio_item)

    merged.extend(unmatched_audio)
    merged.sort(key=lambda c: c.published_at, reverse=True)
    return merged
