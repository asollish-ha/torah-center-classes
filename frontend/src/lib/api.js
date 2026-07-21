const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function fetchClasses({ q, type, series } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type && type !== "all") params.set("type", type);
  if (series && series !== "All Topics") params.set("series", series);

  const res = await fetch(`${API_BASE}/classes?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load classes (${res.status})`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

// Points a native <audio> element's src at this instead of resolving
// SoundCloud's signed CDN URL client-side — the signature is short-lived and
// tied to server-side resolution, and this endpoint 302-redirects to it.
export function soundcloudStreamUrl(trackId) {
  return `${API_BASE}/stream/soundcloud/${trackId}`;
}

// Returns { class_id, segments: [{ start, end, text }] } or null if no
// transcript fixture exists yet for this class (prototype feature — most
// classes won't have one).
export async function fetchTranscript(classId) {
  const res = await fetch(`${API_BASE}/classes/${classId}/transcript`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load transcript (${res.status})`);
  return res.json();
}
