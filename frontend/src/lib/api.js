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
