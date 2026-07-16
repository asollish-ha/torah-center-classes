const SAVED_IDS_KEY = "torah-center-saved-ids";
const PROGRESS_KEY = "torah-center-progress";

// Below this many seconds in, there's nothing worth resuming — treat it the
// same as never having started.
const PROGRESS_MIN_SEC = 5;
// Within this many seconds of the end, treat playback as finished rather
// than saving a "resume" point a few seconds from the end.
const PROGRESS_END_BUFFER_SEC = 15;

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

function loadProgressMap() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgressMap(map) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable — progress just won't persist
  }
}

// A class can have independent audio and video progress (e.g. partway
// through watching, separately partway through listening), so position is
// keyed by classId + format rather than just classId.
function progressKey(classId, type) {
  return `${classId}:${type}`;
}

// Returns { currentTime, duration } for the given class+format, or null if
// there's no saved position to resume (never started, or already finished).
export function loadProgress(classId, type) {
  const map = loadProgressMap();
  return map[progressKey(classId, type)] || null;
}

// Records how far into a class/format the user got, so coming back to it
// later — even after closing the app — resumes from there instead of the
// beginning. Near-start positions are ignored (nothing to resume) and
// near-end positions are treated as finished (see clearProgress) rather than
// saved as a resume point a few seconds from the end.
export function saveProgress(classId, type, currentTime, duration) {
  if (!currentTime || currentTime < PROGRESS_MIN_SEC) return;
  if (duration && currentTime > duration - PROGRESS_END_BUFFER_SEC) {
    clearProgress(classId, type);
    return;
  }
  const map = loadProgressMap();
  map[progressKey(classId, type)] = { currentTime, duration, updatedAt: Date.now() };
  saveProgressMap(map);
}

export function clearProgress(classId, type) {
  const map = loadProgressMap();
  delete map[progressKey(classId, type)];
  saveProgressMap(map);
}
