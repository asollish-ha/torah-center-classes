"""Sample classes shown only when neither YouTube nor SoundCloud is configured,
so the app has something to render out of the box. Once real credentials are
set in .env, this is never used — see cache.py.
"""
from __future__ import annotations

from .models import ClassItem, SourceRef, SourceType

DEMO_CLASSES: list[ClassItem] = [
    ClassItem(
        id="demo-1",
        title="Rambam vs. Ramban on Free Will",
        description="A close look at how the Rambam and Ramban diverge on the nature of free will and divine foreknowledge.",
        published_at="2026-07-10T18:00:00Z",
        thumbnail=None,
        series=["Great Debates in Jewish History"],
        types=[SourceType.video, SourceType.audio],
        sources=[
            SourceRef(type=SourceType.video, id="demo1", url="#", embed_url=None, duration_sec=2760),
            SourceRef(type=SourceType.audio, id="demo1a", url="#", embed_url=None, duration_sec=2760),
        ],
    ),
    ClassItem(
        id="demo-2",
        title="Parshat Pinchas: Zealotry and Its Limits",
        description="Examining when zealotry is celebrated in the Torah and when it's condemned by the sages.",
        published_at="2026-07-08T18:00:00Z",
        thumbnail=None,
        series=["Parsha Shiurim"],
        types=[SourceType.video],
        sources=[SourceRef(type=SourceType.video, id="demo2", url="#", duration_sec=1980)],
    ),
    ClassItem(
        id="demo-3",
        title="The Soul's Journey Before Birth",
        description="An introduction to the Kabbalistic concept of the soul's descent into the physical world.",
        published_at="2026-07-05T18:00:00Z",
        thumbnail=None,
        series=["Kabbalah Cafe"],
        types=[SourceType.audio],
        sources=[SourceRef(type=SourceType.audio, id="demo3", url="#", duration_sec=3120)],
    ),
    ClassItem(
        id="demo-4",
        title="Practical Halacha: Shabbat in the Modern Kitchen",
        description="How classical halachic principles apply to modern kitchen appliances on Shabbat.",
        published_at="2026-07-01T18:00:00Z",
        thumbnail=None,
        series=["Torah Studies 5786"],
        types=[SourceType.video],
        sources=[SourceRef(type=SourceType.video, id="demo4", url="#", duration_sec=2400)],
    ),
    ClassItem(
        id="demo-5",
        title="What Makes a Mitzvah Meaningful?",
        description="Exploring the interplay between intention (kavanah) and action in Jewish practice.",
        published_at="2026-06-27T18:00:00Z",
        thumbnail=None,
        series=["Practical Faith"],
        types=[SourceType.audio],
        sources=[SourceRef(type=SourceType.audio, id="demo5", url="#", duration_sec=1860)],
    ),
]
