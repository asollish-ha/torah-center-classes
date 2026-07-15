import { placeholderStyle } from "../lib/placeholder";

export default function PlaylistsRow({ playlists, onSelect }) {
  if (playlists.length === 0) return null;

  return (
    <section className="mb-5">
      <h2 className="font-heading font-bold text-[15px] text-text-primary mb-3">Featured playlists</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {playlists.map((p) => (
          <button
            key={p.name}
            onClick={() => onSelect(p.name)}
            className="shrink-0 w-[132px] text-left flex flex-col"
          >
            <div
              className="relative w-[132px] h-[132px] rounded-thumb overflow-hidden shrink-0"
              style={placeholderStyle(p.name)}
            >
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-navy/60 text-white text-[9px] font-mono">
                {p.count} class{p.count === 1 ? "" : "es"}
              </span>
            </div>
            <div className="mt-1.5 font-heading font-bold text-[12.5px] text-text-primary line-clamp-2 min-h-[38px]">
              {p.name}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
