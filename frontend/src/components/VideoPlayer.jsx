import { formatDate, primaryDuration } from "../lib/format";
import { ChevronLeftIcon, PlayIcon, HeartIcon, ShareIcon, DownloadIcon } from "./icons";
import IconButton from "./IconButton";

export default function VideoPlayer({ item, isSaved, onBack, onToggleSave, onShare, onDownload }) {
  const duration = primaryDuration(item.sources);
  const metaLine = [item.series[0], formatDate(item.published_at), duration].filter(Boolean).join(" · ");
  const videoSource = item.sources.find((s) => s.type === "video");

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
        {videoSource?.embed_url ? (
          <iframe
            src={videoSource.embed_url}
            title={item.title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
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
