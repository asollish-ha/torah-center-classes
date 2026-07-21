import { CloseIcon, SparkleIcon } from "./icons";

// Full-screen picker for "What's your inspiration today?" — a different,
// complementary way into the catalog from the Topics dropdown (which groups
// by series/playlist). Moods are keyword-tagged server-side per class (see
// backend/app/services/moods.py); a class can carry several, or none.
export default function MoodPicker({ moods, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full md:max-w-[420px] md:rounded-[20px] bg-white rounded-t-[20px] p-5 pb-7 md:pb-6 max-h-[85vh] overflow-y-auto animate-[slide-up_0.2s_ease-out]">
        <div className="flex items-start justify-between mb-1">
          <div className="w-9 h-9 rounded-full bg-chip-active text-teal flex items-center justify-center">
            <SparkleIcon />
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted p-1">
            <CloseIcon />
          </button>
        </div>
        <h2 className="font-heading font-bold text-[19px] text-text-strong mb-1">
          What's your inspiration today?
        </h2>
        <p className="font-body text-[13.5px] text-text-secondary mb-5">
          Pick a mood and we'll find classes that speak to it.
        </p>

        <div className="flex flex-wrap gap-2">
          {moods.map((mood) => (
            <button
              key={mood}
              onClick={() => onSelect(mood)}
              className="px-4 py-2 rounded-full bg-chip-inactive text-text-primary text-[13.5px] font-body font-semibold hover:bg-chip-active hover:text-teal transition-colors"
            >
              {mood}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
