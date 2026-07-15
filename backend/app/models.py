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


class Feed(BaseModel):
    classes: list[ClassItem]
    series: list[str]
    generated_at: datetime
    stale: bool = False
    errors: list[str] = Field(default_factory=list)
