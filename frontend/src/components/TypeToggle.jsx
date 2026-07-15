const OPTIONS = [
  { value: "all", label: "All" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
];

export default function TypeToggle({ value, onChange }) {
  return (
    <div className="inline-flex bg-chip-inactive rounded-full p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 h-8 rounded-full text-[13px] font-heading transition-colors ${
            value === opt.value
              ? "bg-white text-navy font-extrabold"
              : "text-text-secondary font-semibold"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
