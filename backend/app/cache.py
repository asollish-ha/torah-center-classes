"""In-memory feed cache with a background refresh loop.

Keeping this in-process (rather than e.g. Redis) is intentional: a single
Render web service instance polling YouTube/SoundCloud hourly needs nothing
fancier. If this ever runs as multiple instances, move the cache to Redis so
they share one copy instead of each hitting the upstream APIs independently.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .config import settings
from .demo_data import DEMO_CLASSES
from .models import Feed
from .services.matcher import merge_classes
from .services.moods import ALL_MOODS, attach_moods
from .services.soundcloud import fetch_soundcloud_classes
from .services.youtube import fetch_youtube_classes

log = logging.getLogger(__name__)


class FeedCache:
    def __init__(self) -> None:
        self._feed: Feed | None = None
        self._scheduler = AsyncIOScheduler()
        self._lock = asyncio.Lock()

    @property
    def feed(self) -> Feed | None:
        return self._feed

    async def refresh(self) -> Feed:
        async with self._lock:
            if not settings.youtube_enabled and not settings.soundcloud_enabled:
                classes = attach_moods(list(DEMO_CLASSES))
                feed = Feed(
                    classes=classes,
                    series=sorted({s for c in classes for s in c.series}),
                    generated_at=datetime.now(timezone.utc),
                    stale=False,
                    errors=["No YouTube/SoundCloud credentials configured — showing demo data."],
                    moods=list(ALL_MOODS),
                )
                self._feed = feed
                log.warning("No credentials configured — serving demo data.")
                return feed

            errors: list[str] = []
            youtube_classes: list = []
            soundcloud_classes: list = []

            try:
                youtube_classes = await fetch_youtube_classes()
            except Exception as exc:  # noqa: BLE001 - surface any upstream failure
                log.exception("YouTube fetch failed")
                errors.append(f"YouTube: {exc}")

            try:
                soundcloud_classes = await fetch_soundcloud_classes()
            except Exception as exc:  # noqa: BLE001
                log.exception("SoundCloud fetch failed")
                errors.append(f"SoundCloud: {exc}")

            classes = attach_moods(merge_classes(youtube_classes, soundcloud_classes))
            all_series = sorted({s for c in classes for s in c.series})

            feed = Feed(
                classes=classes,
                series=all_series,
                generated_at=datetime.now(timezone.utc),
                stale=False,
                errors=errors,
                moods=list(ALL_MOODS),
            )

            # If this refresh produced nothing but we already had a good feed,
            # keep serving the old one instead of blanking the site out.
            if not classes and self._feed and self._feed.classes:
                feed.classes = self._feed.classes
                feed.series = self._feed.series
                feed.stale = True

            self._feed = feed
            log.info(
                "Feed refreshed: %d classes (%d series), errors=%s",
                len(feed.classes), len(feed.series), errors,
            )
            return feed

    def start_background_refresh(self) -> None:
        """Schedules periodic refreshes. Call `refresh()` once yourself first
        (e.g. at app startup) — this only schedules the *subsequent* runs."""
        self._scheduler.add_job(
            self.refresh,
            "interval",
            seconds=settings.refresh_interval_seconds,
            id="refresh_feed",
            max_instances=1,
        )
        self._scheduler.start()

    def stop_background_refresh(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)


feed_cache = FeedCache()
