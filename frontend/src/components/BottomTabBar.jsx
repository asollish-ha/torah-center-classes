import { HomeIcon, HeartIcon } from "./icons";

export default function BottomTabBar({ activeTab, onTabChange }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around z-40">
      <TabButton icon={<HomeIcon />} label="Home" active={activeTab === "home"} onClick={() => onTabChange("home")} />
      <TabButton icon={<HeartIcon />} label="Favorites" active={activeTab === "saved"} onClick={() => onTabChange("saved")} />
    </nav>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 text-[11px] font-heading font-semibold ${
        active ? "text-teal" : "text-text-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
