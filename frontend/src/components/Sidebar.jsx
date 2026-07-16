import { HomeIcon, HeartIcon } from "./icons";

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="hidden md:flex w-[248px] shrink-0 bg-sidebar flex-col p-5">
      <div className="flex items-center gap-2.5 mb-8">
        <img src="/icon.png" alt="" className="w-[34px] h-[34px] rounded-[10px] bg-white p-1" />
        <div className="font-heading font-bold text-[16px] text-white leading-tight">
          The Torah Center
          <div className="font-body font-normal text-[12px] text-white/60">of Atlanta</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        <NavItem icon={<HomeIcon />} label="Home" active={activeTab === "home"} onClick={() => onTabChange("home")} />
        <NavItem icon={<HeartIcon />} label="Favorites" active={activeTab === "saved"} onClick={() => onTabChange("saved")} />
      </nav>

      <div className="mt-auto text-[12.5px] text-white/50 leading-snug">
        Torah classes from our teachers, streaming anywhere.
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-full text-[14.5px] font-heading font-semibold transition-colors ${
        active ? "bg-teal text-white" : "text-white/70 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
