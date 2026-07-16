import { useEffect, useRef } from "react";
import { formatDate, primaryDuration } from "../lib/format";
import { loadProgress, saveProgress, clearProgress } from "../lib/storage";
import { ChevronLeftIcon, PlayIcon, EqualizerIcon, HeartIcon, ShareIcon, DownloadIcon } from "./icons";
import IconButton from "./IconButton";

// Loads the YouTube IFrame Player API script once, no matter how many
// VideoPlayer instances mount over the app's lifetime, and lets each caller
// await its readiness independently (multiple callers can register with
// window.onYouTubeIframeAPIReady — the API only ever calls it once globally).
function loadYouTubeApi(onReady) {
  if (window.YT && window.YT.Player) {
    onReady();
    return;
  }
  if (!document.getElementById("youtube-iframe-api")) {
    const tag = document.createElement("script");
    tag.id = "youtube-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }
  const previous = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    previous?.();
    onReady();
  };
}

export default function VideoPlayer({ item, isSaved, onBack, onToggleSave, onShare, onDownload, onListen }) {
  const hasAudio = item.types.includes("audio");
  const duration = primaryDuration(item.sources);
  const metaLine = [item.series[0], formatDate(item.published_at), duration].filter(Boolean).join(" · ");
  const videoSource = item.sources.find((s) => s.type === "video");

  const containerRef = useRef(null);
  const playerRef = useRef(null);
  // Mirrors live playback position outside React state, since the effect's
  // cleanup (and the polling interval) need the latest value without
  // depending on state that would force the player to be recreated.
  const progressRef = useRef({ currentTime: 0, duration: 0 });

  // Real playback via the YouTube IFrame Player API (instead of a plain
  // <iframe src=...>) so we can resume from a saved position and track
  // progress as the class plays, the same way audio already does via the
  // SoundCloud Widget API.
  useEffect(() => {
    // embed_url (not just id) gates whether this is a real, playable video —
    // demo/fallback data can have a placeholder id with no embed_url, and
    // should keep showing the "VIDEO EMBED" placeholder below rather than
    // attempt to load a bogus YouTube video.
    if (!videoSource?.embed_url || !videoSource?.id) return;
    let cancelled = false;
    let pollId = null;
    const classId = item.id;
    progressRef.current = { currentTime: 0, duration: 0 };

    const create = () => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      const saved = loadProgress(classId, "video");

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoSource.id,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          origin: window.location.origin,
          start: saved?.currentTime ? Math.floor(saved.currentTime) : 0,
        },
        events: {
          onReady: () => {
            progressRef.current.duration = playerRef.current.getDuration() || 0;
          },
          onStateChange: (e) => {
            const State = window.YT.PlayerState;
            if (e.data === State.PLAYING) {
              if (pollId) clearInterval(pollId);
              pollId = setInterval(() => {
                if (!playerRef.current) return;
                const t = playerRef.current.getCurrentTime();
                progressRef.current.currentTime = t;
                saveProgress(classId, "video", t, progressRef.current.duration);
              }, 5000);
            } else if (pollId) {
              clearInterval(pollId);
              pollId = null;
            }
            if (e.data === State.PAUSED) {
              saveProgress(classId, "video", progressRef.current.currentTime, progressRef.current.duration);
            } else if (e.data === State.ENDED) {
              clearProgress(classId, "video");
            }
          },
        },
      });
    };

    loadYouTubeApi(create);

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      // Persist final position before tearing down — covers navigating
      // away (Back, Listen instead) without an explicit pause first.
      if (progressRef.current.currentTime > 0) {
        saveProgress(classId, "video", progressRef.current.currentTime, progressRef.current.duration);
      }
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [item.id, videoSource?.embed_url, videoSource?.id]);

  return (
    <div>
      <button
        onClick={onBack}
        aria-label="Back"
        className="w-[38px] h-[38px] rounded-full bg-white border border-border-soft flex items-center justify-center text-navy mb-4"
      >
        <ChevronLeftIcon />
      </button>

      <div className="relative w-full aspect-video rounded-detail overflow-hidden bg-[#0B2436] mb-4">
        {videoSource?.embed_url && videoSource?.id ? (
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        ) : (
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-[60px] h-[60px] rounded-full bg-white/25 flex items-center justify-center text-white">
                <PlayIcon width={22} height={22} />
              </span>
            </span>
            <span className="absolute bottom-3 right-4 text-white/40 text-[10px] font-mono tracking-wide">
              VIDEO EMBED
            </span>
          </>
        )}
      </div>

      {item.series[0] && (
        <span className="inline-block px-3 py-1 rounded-full bg-chip-active text-teal text-[12px] font-bold mb-3">
          {item.series[0]}
        </span>
      )}

      <h1 className="font-heading font-bold text-[22px] text-text-primary leading-snug mb-1.5">{item.title}</h1>

      <div className="text-[13.5px] text-text-secondary mb-4">{metaLine}</div>

      <p className="text-[14.5px] text-[#3D3A34] leading-[1.65] mb-6 whitespace-pre-line">
        {item.description || "No description available."}
      </p>

      <div className="flex items-center gap-3">
        {hasAudio && (
          // Lets someone who tapped "Watch" (or landed here via the row's
          // quick-play, which prefers video only when there's no audio)
          // switch to the audio version instead of getting stuck with only
          // the video, no way back to audio, and a Back button that exits
          // to the browse list entirely.
          <button
            onClick={onListen}
            className="flex-1 h-12 rounded-full bg-white border border-border-soft text-navy flex items-center justify-center gap-2 font-heading font-bold text-[14.5px]"
          >
            <EqualizerIcon width={16} height={16} />
            Listen instead
          </button>
        )}
        <IconButton active={isSaved} onClick={onToggleSave} label="Save">
          <HeartIcon filled={isSaved} />
        </IconButton>
        <IconButton onClick={onShare} label="Share">
          <ShareIcon />
        </IconButton>
        <IconButton onClick={onDownload} label="Download">
          <DownloadIcon />
        </IconButton>
      </div>
    </div>
  );
}
