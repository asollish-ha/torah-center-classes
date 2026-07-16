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

// Classes with a video recording almost always also carry an audio-only
// source (e.g. the same talk re-uploaded to SoundCloud), so a class's
// `types` array is often ["audio", "video"]. Displaying that literally as
// "audio + video" is confusing and makes the Video/Audio filter tabs
// useless (every video class also matches "Audio"). Treat "has video" as
// the single, primary type — audio-only applies only when no video exists.
export function primaryType(types) {
  return types.includes("video") ? "video" : "audio";
}
