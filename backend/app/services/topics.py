"""Keyword-based topic tagging for the "Topics" filter dropdown.

Replaces the old approach (frontend lib/topics.js, now removed), which
grouped classes by series/playlist *name* into a handful of loose buckets
(Torah Studies, JLI Courses, Kabbalah Café, ...). That worked but was a proxy
for topic ("what series is this filed under") rather than the topic itself,
and it didn't scale as a user-facing vocabulary — series names are an
implementation detail of how content gets uploaded, not what a visitor is
looking for.

This tags classes directly against a fixed, curated subject taxonomy, the
same way services/moods.py tags mood — computed at cache-refresh time so it
stays current automatically. A class can carry multiple topics (e.g. a Parsha
class about Israel) or none.
"""
from __future__ import annotations

import re

from ..models import ClassItem

# Curated, alphabetical — the order they're presented to the user.
ALL_TOPICS: list[str] = [
    "Ethics",
    "Halacha",
    "History",
    "Holidays",
    "Israel",
    "Kabbalah",
    "Parsha",
    "Prayer",
]

# The 54 weekly Torah portions (including the standard combined
# double-portions, e.g. "Chukat-Balak") — class titles very reliably name the
# parsha directly (e.g. "Torah Studies 5786 - 34 - Chukat-Balak: ..."), so
# this alone is a strong signal for the Parsha topic.
PARSHA_NAMES = [
    "Bereishit", "Noach", "Lech Lecha", "Vayera", "Chayei Sara", "Toldot",
    "Vayetzei", "Vayishlach", "Vayeshev", "Miketz", "Vayigash", "Vayechi",
    "Shemot", "Vaera", "Bo", "Beshalach", "Yitro", "Mishpatim", "Terumah",
    "Tetzaveh", "Ki Tisa", "Vayakhel", "Pekudei", "Vayikra", "Tzav",
    "Shmini", "Tazria", "Metzora", "Achrei Mot", "Kedoshim", "Emor",
    "Behar", "Bechukotai", "Bamidbar", "Nasso", "Beha'alotcha", "Shlach",
    "Korach", "Chukat", "Balak", "Pinchas", "Matot", "Masei", "Devarim",
    "Vaetchanan", "Eikev", "Re'eh", "Shoftim", "Ki Teitzei", "Ki Tavo",
    "Nitzavim", "Vayeilech", "Haazinu", "Vezot Haberachah",
]

# Keyword/phrase lists per topic. Matched case-insensitively against
# title + description + series names, with word boundaries (see moods.py for
# the same pattern/rationale).
TOPIC_KEYWORDS: dict[str, list[str]] = {
    "Parsha": [
        "parsha", "parshah", "parasha", "parashah", "parashat",
        "weekly torah portion", "torah portion",
        *PARSHA_NAMES,
    ],
    "Halacha": [
        "halacha", "halachah", "halachic", "jewish law", "shulchan aruch",
        "kosher", "kashrut", "practical halacha", "psak", "poskim",
        "eruv", "hilchot", "hilchos",
    ],
    "History": [
        "history", "historical", "biography", "holocaust", "shoah",
        "chassidic history", "chabad history", "life story",
        "founding", "civics",
    ],
    "Holidays": [
        "rosh hashanah", "yom kippur", "sukkot", "simchat torah",
        "simchas torah", "chanukah", "hanukkah", "purim", "pesach",
        "passover", "shavuot", "shavuos", "tisha b'av", "9 av",
        "tu bishvat", "lag baomer", "high holiday", "high holidays",
        "yamim noraim", "seder", "boot camp",
    ],
    "Prayer": [
        "prayer", "tefillah", "tefila", "davening", "siddur", "amidah",
        "shema", "kaddish", "blessing", "brachot", "berachot", "brocha",
    ],
    "Ethics": [
        "ethics", "ethical", "mussar", "character development",
        "midot", "middot", "morality", "moral dilemma", "values",
    ],
    "Kabbalah": [
        "kabbalah", "kabbalistic", "mysticism", "mystical", "zohar",
        "tanya", "chassidus", "chassidic thought", "sefirot", "soul's journey",
        "soul's descent",
    ],
    "Israel": [
        "israel", "zionism", "zionist", "jerusalem", "holy land", "idf",
        "aliyah", "am yisrael",
    ],
}

_COMPILED: dict[str, re.Pattern] = {
    topic: re.compile(
        r"\b(" + "|".join(re.escape(kw) for kw in keywords) + r")\b",
        re.IGNORECASE,
    )
    for topic, keywords in TOPIC_KEYWORDS.items()
}


def tag_topics(title: str, description: str, series: list[str]) -> list[str]:
    """Returns the subset of ALL_TOPICS whose keywords appear in the given
    title/description/series names, in taxonomy order. Zero, one, or several
    topics can match."""
    text = f"{title}\n{description}\n{' '.join(series)}"
    return [topic for topic in ALL_TOPICS if _COMPILED[topic].search(text)]


def attach_topics(classes: list[ClassItem]) -> list[ClassItem]:
    """Returns new ClassItem copies with `.topics` populated."""
    return [
        c.model_copy(update={"topics": tag_topics(c.title, c.description, c.series)})
        for c in classes
    ]
