export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDuration(sec) {
  if (!sec) return null;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM ? `${h}h ${remM}m` : `${h}h`;
}

export function primaryDuration(sources) {
  const withDuration = sources.find((s) => s.duration_sec);
  return withDuration ? formatDuration(withDuration.duration_sec) : null;
}

// Label shown on each row in the browse list, and used to drive the
// Video/Audio filter tabs (a class shows under a tab if its types include
// that format — a class with both shows under both, since both are
// independently playable via ClassDetail's Watch/Listen buttons).
export function formatTypeLabel(types) {
  const hasVideo = types.includes("video");
  const hasAudio = types.includes("audio");
  if (hasVideo && hasAudio) return "video + audio";
  return hasVideo ? "video" : "audio";
}
