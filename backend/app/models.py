from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SourceType(str, Enum):
    video = "video"
    audio = "audio"


class SourceRef(BaseModel):
    """A single platform's copy of a class (before/after merging duplicates)."""

    type: SourceType
    id: str  # youtube videoId or soundcloud track id
    url: str
    embed_url: str | None = None
    duration_sec: int | None = None
    thumbnail: str | None = None


class ClassItem(BaseModel):
    id: str
    title: str
    description: str = ""
    published_at: datetime
    thumbnail: str | None = None
    series: list[str] = Field(default_factory=list)
    types: list[SourceType] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)
    # Keyword-tagged moods (e.g. "Gratitude", "Comfort & Healing") — see
    # services/moods.py. Computed at cache-refresh time, not user-editable.
    moods: list[str] = Field(default_factory=list)
    # Keyword-tagged subjects (e.g. "Parsha", "Halacha") — see
    # services/topics.py. Powers the "Topics" filter dropdown. Computed at
    # cache-refresh time, not user-editable.
    topics: list[str] = Field(default_factory=list)


class Feed(BaseModel):
    classes: list[ClassItem]
    series: list[str]
    generated_at: datetime
    stale: bool = False
    errors: list[str] = Field(default_factory=list)
    # The full curated mood taxonomy (services.moods.ALL_MOODS), so the
    # frontend's "What's your inspiration today?" picker always shows every
    # mood — including ones with zero matches in the current feed — without
    # a second round trip.
    moods: list[str] = Field(default_factory=list)
    # The full curated topic taxonomy (services.topics.ALL_TOPICS), same
    # rationale — powers the "Topics" dropdown.
    topics: list[str] = Field(default_factory=list)
