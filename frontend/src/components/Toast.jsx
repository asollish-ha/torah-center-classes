import { useEffect } from "react";

export default function Toast({ message, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[60] bg-[#1C1B19] text-white text-[13px] font-body px-4 py-2.5 rounded-full shadow-menu whitespace-nowrap">
      {message}
    </div>
  );
}
