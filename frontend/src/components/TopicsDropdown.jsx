import { useState } from "react";
import { ChevronDownIcon } from "./icons";

export default function TopicsDropdown({ series, value, onChange }) {
  const [open, setOpen] = useState(false);
  const options = ["Topics", ...series];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-4 rounded-full border border-border bg-white text-[13px] font-heading font-semibold text-navy"
      >
        {value}
        <ChevronDownIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-[14px] shadow-menu py-2 z-20 max-h-72 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-[13.5px] font-body ${
                  opt === value ? "bg-chip-active text-teal font-semibold" : "text-text-primary"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
