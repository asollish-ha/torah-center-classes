// The upstream feed has 180+ individual series (JLI courses, Kabbalah Café
// cohorts, yearly Torah Studies cycles, one-off holiday boot camps, etc).
// That's too many to be a useful "Topics" filter, so we group them into a
// small set of broad categories here. Featured playlist cards still filter
// by the exact series name (see App.jsx) — this layer only powers the
// "Topics" dropdown.
const CATEGORY_RULES = [
  { name: "Torah Studies", test: (s) => s.startsWith("Torah Studies") },
  { name: "JLI Courses", test: (s) => s.startsWith("JLI") },
  // "Kabbalah Café"/"Kabbalah Cafe" and "Kabbalah & Coffee" are the same
  // ongoing series rebranded/retitled across different cohorts over the
  // years — group them together rather than splintering into two topics.
  {
    name: "Kabbalah Café",
    test: (s) => s.startsWith("Kabbalah Caf") || s.startsWith("Kabbalah & Coffee"),
  },
  {
    name: "Holidays & Seasons",
    test: (s) =>
      /High Holiday|Pesach Boot Camp|Purim Boot Camp|Chanukah Classes|Pesach Classes|Shavuot Classes/.test(s),
  },
  {
    name: "Ongoing Classes",
    test: (s) =>
      ["Daily Wisdom with Rabbi Ari Sollish", "Sunday Kolel - Year 3", "The Hebrew Course"].includes(s) ||
      s.startsWith("Semichas Chaver Chabad"),
  },
];

const OTHER_CATEGORY = "Special Topics";

// Display order for whichever categories are actually present in the feed.
const CATEGORY_ORDER = [...CATEGORY_RULES.map((r) => r.name), OTHER_CATEGORY];

export function categoryForSeries(series) {
  for (const rule of CATEGORY_RULES) {
    if (rule.test(series)) return rule.name;
  }
  return OTHER_CATEGORY;
}

// A class's own title is a more reliable signal of its "real" topic than
// the SoundCloud playlist(s) it happens to be filed under — playlists on
// the upstream account sometimes include a handful of unrelated one-off
// episodes (e.g. an old "Torah Studies 5780" holiday episode tucked into
// the "Kabbalah & Coffee: Learning How to Love" playlist), which would
// otherwise leak that class into the wrong Topics filter. So: prefer a
// category match on the title first, and only fall back to the class's
// series/playlist names when the title itself doesn't identify one.
export function categoryForClass(item) {
  const titleCategory = categoryForSeries(item.title);
  if (titleCategory !== OTHER_CATEGORY) return titleCategory;
  for (const s of item.series) {
    const category = categoryForSeries(s);
    if (category !== OTHER_CATEGORY) return category;
  }
  return OTHER_CATEGORY;
}

export function buildTopicCategories(seriesList) {
  const present = new Set(seriesList.map(categoryForSeries));
  return CATEGORY_ORDER.filter((c) => present.has(c));
}
