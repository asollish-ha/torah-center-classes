export const SearchIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
  </svg>
);

export const PlayIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export const EqualizerIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
    <path d="M6 18V10M12 18V6M18 18v-5" />
  </svg>
);

export const HomeIcon = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
    <path d="M3 11l9-8 9 8" strokeLinecap="round" />
    <path d="M5 10v10h14V10" />
  </svg>
);

export const BookmarkIcon = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
    <path d="M6 3h12v18l-6-4-6 4V3z" />
  </svg>
);

export const ChevronDownIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const ChevronLeftIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const HeartIcon = ({ filled, ...props }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...props}>
    <path d="M12 21s-7.5-4.6-10-9.1C.5 8.2 2.3 5 5.6 5c1.9 0 3.4 1 4.9 2.9C12 6 13.5 5 15.4 5c3.3 0 5.1 3.2 3.6 6.9C19.5 16.4 12 21 12 21z" />
  </svg>
);

export const ShareIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 10.6l6.8-3.8M8.6 13.4l6.8 3.8" />
  </svg>
);

export const DownloadIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3v13" />
    <path d="M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </svg>
);

export const PauseIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const Rewind15Icon = (props) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 12a8 8 0 1 1 2.5 5.8" />
    <path d="M4 7v5h5" />
    <text x="7" y="15.5" fontSize="6.5" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">15</text>
  </svg>
);

export const Forward15Icon = (props) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 12a8 8 0 1 0-2.5 5.8" />
    <path d="M20 7v5h-5" />
    <text x="10" y="15.5" fontSize="6.5" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="700">15</text>
  </svg>
);
