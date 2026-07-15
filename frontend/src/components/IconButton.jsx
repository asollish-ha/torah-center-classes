export default function IconButton({ children, onClick, active, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${
        active ? "border-teal text-teal bg-chip-active" : "border-border-soft text-navy bg-white"
      }`}
    >
      {children}
    </button>
  );
}
