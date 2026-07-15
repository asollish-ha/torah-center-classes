const SAVED_IDS_KEY = "torah-center-saved-ids";

export function loadSavedIds() {
  try {
    const raw = localStorage.getItem(SAVED_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function saveSavedIds(ids) {
  try {
    localStorage.setItem(SAVED_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable (private browsing, quota) — saved state just won't persist
  }
}
