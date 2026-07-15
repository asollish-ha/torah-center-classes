import { placeholderStyle } from "../lib/placeholder";
import { PlayIcon, PauseIcon } from "./icons";

export default function MiniPlayer({ item, audio, onTogglePlay, onExpand }) {
  const progress = audio.duration ? Math.min(audio.currentTime / audio.duration, 1) : 0;

  return (
    <div className="fixed left-0 right-0 bottom-16 md:bottom-0 md:left-[248px] bg-white border-t border-border-soft shadow-player z-30">
      <div className="h-[2.5px] bg-border-softer">
        <div className="h-full bg-teal" style={{ width: `${progress * 100}%` }} />
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onExpand}
        className="w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer"
      >
        <div
          className="shrink-0 w-10 h-10 rounded-[10px] bg-cover bg-center"
          style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : placeholderStyle(item.id)}
        />
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[13px] text-text-primary truncate">{item.title}</div>
          <div className="text-[11.5px] text-text-secondary truncate">{item.series[0] || ""}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          aria-label={audio.playing ? "Pause" : "Play"}
          className="shrink-0 w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center"
        >
          {audio.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
    </div>
  );
}
