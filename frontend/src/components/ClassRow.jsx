import { placeholderStyle } from "../lib/placeholder";
import { formatDate, primaryDuration, primaryType } from "../lib/format";
import { PlayIcon, PauseIcon } from "./icons";

export default function ClassRow({ item, onSelect, onPlay, isPlaying }) {
  const duration = primaryDuration(item.sources);
  const typeLabel = primaryType(item.types);

  return (
    <div className="w-full flex items-center gap-3.5 py-3 border-b border-border-soft">
      <button onClick={() => onSelect(item)} className="flex-1 min-w-0 flex items-center gap-3.5 text-left">
        <div
          className="shrink-0 w-[74px] h-[74px] rounded-thumb bg-cover bg-center"
          style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})` } : placeholderStyle(item.id)}
        />
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[14.5px] text-text-primary line-clamp-2 leading-snug">
            {item.title}
          </div>
          {item.series.length > 0 && (
            <div className="text-[12.5px] text-text-secondary mt-0.5 truncate">{item.series[0]}</div>
          )}
          <div className="text-[11.5px] text-text-tertiary mt-0.5">
            {formatDate(item.published_at)}
            {duration ? ` · ${duration}` : ""} · {typeLabel}
          </div>
        </div>
      </button>
      <button
        onClick={() => onPlay(item)}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="shrink-0 w-[38px] h-[38px] rounded-full bg-navy text-white flex items-center justify-center"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}
