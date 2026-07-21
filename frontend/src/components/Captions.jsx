import { useEffect, useRef, useState } from "react";
import { fetchTranscript } from "../lib/api";

// Test/prototype feature: most classes have no transcript fixture yet, so
// this quietly renders nothing rather than showing an error or empty state
// when fetchTranscript resolves to null (404).

// Segments are ordered and non-overlapping, so binary search finds the
// active line in O(log n) instead of scanning ~1200 segments on every
// timeupdate tick.
function findActiveIndex(segments, time) {
  let lo = 0;
  let hi = segments.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // Only treat it as "active" if we're still within that line's window —
  // otherwise we're in a gap between lines and nothing should highlight.
  if (result >= 0 && time > segments[result].end + 1) return -1;
  return result;
}

const WINDOW = 22; // lines rendered on each side of the active line

export default function Captions({ classId, currentTime, onSeek }) {
  const [segments, setSegments] = useState(null);
  const activeRef = useRef(null);
  const containerRef = useRef(null);
  const lastActiveIndex = useRef(-1);

  useEffect(() => {
    let cancelled = false;
    setSegments(null);
    fetchTranscript(classId)
      .then((data) => {
        if (!cancelled) setSegments(data ? data.segments : []);
      })
      .catch(() => {
        if (!cancelled) setSegments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const activeIndex = segments ? findActiveIndex(segments, currentTime) : -1;

  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== lastActiveIndex.current && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    lastActiveIndex.current = activeIndex;
  }, [activeIndex]);

  if (!segments || segments.length === 0) return null;

  const start = Math.max(0, (activeIndex === -1 ? 0 : activeIndex) - WINDOW);
  const end = Math.min(segments.length, (activeIndex === -1 ? 0 : activeIndex) + WINDOW + 1);
  const visible = segments.slice(start, end);

  return (
    <div
      ref={containerRef}
      className="w-full max-h-[220px] overflow-y-auto rounded-[14px] bg-white/5 px-4 py-3 mb-8 text-left"
    >
      {visible.map((seg, i) => {
        const idx = start + i;
        const isActive = idx === activeIndex;
        return (
          <p
            key={idx}
            ref={isActive ? activeRef : null}
            onClick={() => onSeek(seg.start)}
            className={`py-1 cursor-pointer transition-colors text-[14px] leading-relaxed ${
              isActive ? "text-white font-bold" : "text-white/40 hover:text-white/70"
            }`}
          >
            {seg.text}
          </p>
        );
      })}
    </div>
  );
}
