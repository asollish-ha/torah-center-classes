import { placeholderStyle } from "../lib/placeholder";
import { formatDate, primaryDuration } from "../lib/format";
import { ChevronLeftIcon, PlayIcon, EqualizerIcon, HeartIcon, ShareIcon, DownloadIcon } from "./icons";
import IconButton from "./IconButton";

// This screen only gets reached for audio-only classes and classes that have
// *both* a video and an audio recording (see openDetail() in App.jsx —
// video-only classes skip straight to the video screen since there's no
// choice to make). So the only two shapes this component needs to handle
// are "audio only" and "audio + video".
export default function ClassDetail({ item, isSaved, onBack, onToggleSave, onShare, onDownload, onPlayVideo, onPlayAudio }) {
  const hasVideo = item.types.includes("video");
  const hasAudio = item.types.includes("audio");
  const duration = primaryDuration(item.sources);
  const metaLine = [item.series[0], formatDate(item.published_at), duration].filter(Boolean).join(" · ");
  // Thumbnail tap defaults to whichever format is primary — video when both
  // are available (it's a visual poster, so "watch" is the intuitive tap),
  // audio otherwise.
  const onThumbnailPlay = hasVideo ? onPlayVideo : onPlayAudio;

  return (
    <div>
      <button
        onClick={onBack}
        aria-label="Back"
        className="w-[38px] h-[38px] rounded-full bg-white border border-border-soft flex items-center justify-center text-navy mb-4"
      >
        <ChevronLeftIcon />
      </button>

      <button onClick={onThumbnailPlay} className="relative block w-full aspect-[16/10] rounded-detail overflow-hidden mb-4">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : placeholderStyle(item.id)}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-[60px] h-[60px] rounded-full bg-white shadow-menu flex items-center justify-center text-navy">
            <PlayIcon width={22} height={22} />
          </span>
        </span>
      </button>

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
        {hasVideo && hasAudio ? (
          // Both formats exist for this class (e.g. a YouTube recording plus
          // a SoundCloud re-upload of the same shiur) — let the user pick,
          // rather than silently always choosing one for them.
          <>
            <button
              onClick={onPlayVideo}
              className="flex-1 h-12 rounded-full bg-navy text-white flex items-center justify-center gap-2 font-heading font-bold text-[14.5px]"
            >
              <PlayIcon />
              Watch
            </button>
            <button
              onClick={onPlayAudio}
              className="flex-1 h-12 rounded-full bg-white border border-border-soft text-navy flex items-center justify-center gap-2 font-heading font-bold text-[14.5px]"
            >
              <EqualizerIcon width={16} height={16} />
              Listen
            </button>
          </>
        ) : (
          <button
            onClick={onThumbnailPlay}
            className="flex-1 h-12 rounded-full bg-navy text-white flex items-center justify-center gap-2 font-heading font-bold text-[14.5px]"
          >
            <PlayIcon />
            Play class
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
