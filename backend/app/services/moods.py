"""Keyword-based mood tagging.

Most classes have no transcript (only 4/2,388 do — see Captions.jsx), so a
class's title + description is the only signal available at scale. This is a
simple, explainable keyword classifier rather than an LLM call: it runs on
every cache refresh (see cache.py), so it needs to be fast, free, and
deterministic — and curated keyword lists are easy to tune when a mood is
over/under-matching in practice.

This is a *different* taxonomy from lib/topics.js's "Topics" dropdown on the
frontend, which buckets classes by series/playlist name (JLI Courses, Kabbalah
Café, etc). This one answers "what am I in the mood for" rather than "what
type of class is this" — a single class can carry multiple moods, or none.
"""
from __future__ import annotations

import re

from ..models import ClassItem

# Curated, in the order they should be presented to the user.
ALL_MOODS: list[str] = [
    "Comfort & Healing",
    "Resilience",
    "Gratitude",
    "Joy & Celebration",
    "Teshuva & Repentance",
    "Faith & Emunah",
    "Grief & Mourning",
    "Inspiration",
    "Peace & Calm",
    "Courage",
    "Purpose & Meaning",
]

# Keyword/phrase lists per mood. Matched case-insensitively against
# title + description with word boundaries, so e.g. "heal" won't match inside
# an unrelated word. Phrases (multi-word) match as literal substrings with
# boundaries at each end.
MOOD_KEYWORDS: dict[str, list[str]] = {
    "Comfort & Healing": [
        "comfort", "healing", "heal", "solace", "consolation", "console",
        "suffering", "illness", "sickness", "recovery", "hope in hard times",
    ],
    "Resilience": [
        "resilience", "resilient", "overcome", "overcoming", "strength",
        "perseverance", "persevere", "endure", "endurance", "struggle",
        "adversity", "bounce back",
    ],
    "Gratitude": [
        "gratitude", "grateful", "thankful", "thanksgiving", "hakarat hatov",
        "hakaras hatov", "appreciation", "appreciate",
    ],
    "Joy & Celebration": [
        "joy", "joyful", "celebration", "celebrate", "simcha", "happiness",
        "rejoice", "festive", "wedding", "purim", "simchat torah",
    ],
    "Teshuva & Repentance": [
        "teshuva", "teshuvah", "repentance", "repent", "atonement",
        "forgiveness", "forgive", "elul", "yom kippur", "high holidays",
        "selichot",
    ],
    "Faith & Emunah": [
        "emunah", "faith", "belief in god", "trust in god", "bitachon",
        "divine providence", "hashgacha pratis", "hashgacha",
    ],
    "Grief & Mourning": [
        "grief", "grieving", "mourning", "mourn", "loss of a loved one",
        "shiva", "yahrzeit", "yizkor", "kaddish", "bereavement", "eulogy",
    ],
    "Inspiration": [
        "inspiration", "inspiring", "inspire", "motivation", "motivate",
        "uplifting", "uplift", "empower", "empowering",
    ],
    "Peace & Calm": [
        "peace", "peaceful", "calm", "tranquility", "serenity",
        "shalom bayit", "stillness", "mindfulness", "meditation", "meditative",
    ],
    "Courage": [
        "courage", "courageous", "brave", "bravery", "overcoming fear",
        "boldness", "fearless",
    ],
    "Purpose & Meaning": [
        "purpose", "meaning", "meaningful", "life's mission", "mission",
        "calling", "significance", "why we're here",
    ],
}

_COMPILED: dict[str, re.Pattern] = {
    mood: re.compile(
        r"\b(" + "|".join(re.escape(kw) for kw in keywords) + r")\b",
        re.IGNORECASE,
    )
    for mood, keywords in MOOD_KEYWORDS.items()
}


def tag_moods(title: str, description: str) -> list[str]:
    """Returns the subset of ALL_MOODS whose keywords appear in the given
    title/description, in taxonomy order. A class can match zero, one, or
    several moods; zero is fine — not every class is mood-searchable."""
    text = f"{title}\n{description}"
    return [mood for mood in ALL_MOODS if _COMPILED[mood].search(text)]


def attach_moods(classes: list[ClassItem]) -> list[ClassItem]:
    """Returns new ClassItem copies with `.moods` populated. Pydantic models
    are treated as immutable-ish here, so this copies rather than mutates."""
    return [
        c.model_copy(update={"moods": tag_moods(c.title, c.description)})
        for c in classes
    ]
