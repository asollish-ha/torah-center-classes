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
from .services.topics import ALL_TOPICS, attach_topics
from .services.youtube import fetch_youtube_classes

log = logging.getLogger(__name__)


class FeedCache:
    def __init__(self) -> None:
        self._feed: Feed | None = None
        self._scheduler = AsyncIOScheduler()
        self._lock = asyncio.Lock()
        # Last-known-good raw fetch per source, kept separately from `_feed`
        # (which only stores the merged result). A transient failure on one
        # source (e.g. SoundCloud dropping the connection mid-response) falls
        # back to these instead of an empty list — otherwise that source's
        # classes would silently vanish from the merged feed even though the
        # *other* source still succeeded and the overall class count never
        # hit zero, so the "feed went fully empty" safeguard below wouldn't
        # catch it.
        self._last_youtube_classes: list = []
        self._last_soundcloud_classes: list = []

    @property
    def feed(self) -> Feed | None:
        return self._feed

    async def refresh(self) -> Feed:
        async with self._lock:
            if not settings.youtube_enabled and not settings.soundcloud_enabled:
                classes = attach_topics(attach_moods(list(DEMO_CLASSES)))
                feed = Feed(
                    classes=classes,
                    series=sorted({s for c in classes for s in c.series}),
                    generated_at=datetime.now(timezone.utc),
                    stale=False,
                    errors=["No YouTube/SoundCloud credentials configured — showing demo data."],
                    moods=list(ALL_MOODS),
                    topics=list(ALL_TOPICS),
                )
                self._feed = feed
                log.warning("No credentials configured — serving demo data.")
                return feed

            errors: list[str] = []

            try:
                youtube_classes = await fetch_youtube_classes()
                self._last_youtube_classes = youtube_classes
            except Exception as exc:  # noqa: BLE001 - surface any upstream failure
                log.exception("YouTube fetch failed")
                errors.append(f"YouTube: {exc}")
                # Deep-copy: merge_classes() mutates ClassItem objects in
                # place (extends .sources, overwrites .thumbnail), so reusing
                # the cached objects directly would let sources pile up with
                # duplicates across repeated failed-fetch cycles.
                youtube_classes = [c.model_copy(deep=True) for c in self._last_youtube_classes]
                if youtube_classes:
                    log.warning(
                        "Falling back to last-known-good YouTube data (%d classes) for this refresh.",
                        len(youtube_classes),
                    )

            try:
                soundcloud_classes = await fetch_soundcloud_classes()
                self._last_soundcloud_classes = soundcloud_classes
            except Exception as exc:  # noqa: BLE001
                log.exception("SoundCloud fetch failed")
                errors.append(f"SoundCloud: {exc}")
                soundcloud_classes = [c.model_copy(deep=True) for c in self._last_soundcloud_classes]
                if soundcloud_classes:
                    log.warning(
                        "Falling back to last-known-good SoundCloud data (%d classes) for this refresh.",
                        len(soundcloud_classes),
                    )

            classes = attach_topics(attach_moods(merge_classes(youtube_classes, soundcloud_classes)))
            all_series = sorted({s for c in classes for s in c.series})

            feed = Feed(
                classes=classes,
                series=all_series,
                generated_at=datetime.now(timezone.utc),
                stale=False,
                errors=errors,
                moods=list(ALL_MOODS),
                topics=list(ALL_TOPICS),
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
