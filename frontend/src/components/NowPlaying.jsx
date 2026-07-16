import { placeholderStyle } from "../lib/placeholder";
import { ChevronDownIcon, PlayIcon, PauseIcon, HeartIcon, ShareIcon, DownloadIcon, Rewind15Icon, Forward15Icon } from "./icons";

function formatTime(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export default function NowPlaying({
  item,
  audio,
  isSaved,
  rate,
  onCollapse,
  onTogglePlay,
  onSeek,
  onSkip,
  onCycleRate,
  onToggleSave,
  onShare,
  onDownload,
}) {
  const duration = audio.duration || 0;
  const progress = duration ? Math.min(audio.currentTime / duration, 1) : 0;

  const handleScrubClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    onSeek(ratio * duration);
  };

  return (
    <div className="fixed inset-0 bg-sidebar z-50 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-[480px] flex flex-col items-center px-6 py-6">
        <button onClick={onCollapse} aria-label="Collapse" className="text-white/70 mb-4">
          <ChevronDownIcon width={22} height={22} />
        </button>

        {item.series[0] && (
          <span className="px-3 py-1 rounded-full bg-white/15 text-teal text-[12px] font-bold mb-6">
            {item.series[0]}
          </span>
        )}

        <div
          className="w-full aspect-square rounded-[20px] bg-cover bg-center mb-6"
          style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : placeholderStyle(item.id)}
        />

        <h1 className="font-heading font-bold text-[21px] text-white text-center leading-snug mb-1">{item.title}</h1>
        <div className="text-[13.5px] text-white/60 text-center mb-8">{item.series[0] || ""}</div>

        <div className="w-full mb-1.5 cursor-pointer" onClick={handleScrubClick}>
          <div className="h-[5px] rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-teal rounded-full" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="w-full flex justify-between text-[11.5px] text-white/50 mb-8">
          <span>{formatTime(audio.currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-8 mb-8">
          <button onClick={() => onSkip(-15)} aria-label="Back 15 seconds" className="text-white/80">
            <Rewind15Icon />
          </button>
          <button
            onClick={onTogglePlay}
            aria-label={audio.playing ? "Pause" : "Play"}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-navy"
          >
            {audio.playing ? <PauseIcon width={26} height={26} /> : <PlayIcon width={26} height={26} />}
          </button>
          <button onClick={() => onSkip(15)} aria-label="Forward 15 seconds" className="text-white/80">
            <Forward15Icon />
          </button>
        </div>

        <button
          onClick={onCycleRate}
          aria-label={`Playback speed: ${rate}x. Tap to change.`}
          className="px-4 py-1.5 rounded-full bg-white/15 text-white text-[13px] font-bold mb-8"
        >
          {rate}x speed
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSave}
            aria-label="Save"
            className={`w-11 h-11 rounded-full bg-white/15 flex items-center justify-center ${
              isSaved ? "text-teal" : "text-white"
            }`}
          >
            <HeartIcon filled={isSaved} />
          </button>
          <button
            onClick={onShare}
            aria-label="Share"
            className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white"
          >
            <ShareIcon />
          </button>
          <button
            onClick={onDownload}
            aria-label="Download"
            className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white"
          >
            <DownloadIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
