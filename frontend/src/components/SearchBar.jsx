import { SearchIcon } from "./icons";

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative mb-5">
      <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search classes, teachers, series"
        className="w-full h-11 pl-11 pr-4 rounded-full border border-border bg-white text-[14.5px] font-body outline-none focus:border-teal transition-colors"
      />
    </div>
  );
}
