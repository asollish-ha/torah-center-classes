"""Canonicalizes series/playlist titles across sources.

YouTube and SoundCloud each store their own playlist titles for what is
conceptually the same ongoing series, and those titles don't always agree
between the two platforms. When they differ, fetch_youtube_classes() and
fetch_soundcloud_classes() end up tagging classes with two distinct series
strings for the same series — which fragments Featured Playlist cards and
Topics-filter counts into duplicates.

Known case: several "Kabbalah Café" playlists were created on YouTube years
ago with the plain "Cafe" spelling, while the matching SoundCloud playlist
(created later) uses the accented "Café" spelling. Canonicalize to the
accented form, which is the spelling used consistently everywhere else
(including the standalone "Kabbalah Café: Creation & Redemption" playlist
that has no unaccented counterpart).
"""
from __future__ import annotations

_UNACCENTED_PREFIX = "Kabbalah Cafe:"
_CANONICAL_PREFIX = "Kabbalah Café:"


def normalize_series_title(title: str) -> str:
    if title.startswith(_UNACCENTED_PREFIX):
        return _CANONICAL_PREFIX + title[len(_UNACCENTED_PREFIX):]
    return title
