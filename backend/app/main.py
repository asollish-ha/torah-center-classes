from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .cache import feed_cache
from .config import settings
from .models import Feed, SourceType

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await feed_cache.refresh()
    feed_cache.start_background_refresh()
    yield
    feed_cache.stop_background_refresh()


app = FastAPI(title="Torah Center Classes API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    feed = feed_cache.feed
    return {
        "status": "ok",
        "youtube_configured": settings.youtube_enabled,
        "soundcloud_configured": settings.soundcloud_enabled,
        "classes_cached": len(feed.classes) if feed else 0,
        "last_refreshed": feed.generated_at if feed else None,
    }


@app.get("/api/classes", response_model=Feed)
def get_classes(
    q: str | None = Query(None, description="Search title/description"),
    type: SourceType | None = Query(None, description="Filter by video or audio"),
    series: str | None = Query(None, description="Filter by series/playlist name"),
) -> Feed:
    feed = feed_cache.feed
    if feed is None:
        return Feed(classes=[], series=[], generated_at=None, stale=True)

    classes = feed.classes
    if q:
        needle = q.lower()
        classes = [
            c for c in classes
            if needle in c.title.lower() or needle in c.description.lower()
        ]
    if type:
        classes = [c for c in classes if type in c.types]
    if series:
        classes = [c for c in classes if series in c.series]

    return Feed(
        classes=classes,
        series=feed.series,
        generated_at=feed.generated_at,
        stale=feed.stale,
        errors=feed.errors,
    )


@app.get("/api/series")
def get_series() -> list[str]:
    feed = feed_cache.feed
    return feed.series if feed else []


@app.post("/api/refresh", response_model=Feed)
async def force_refresh() -> Feed:
    """Manual refresh, mainly for local testing — the scheduler already
    refreshes automatically every `REFRESH_INTERVAL_SECONDS`."""
    return await feed_cache.refresh()
