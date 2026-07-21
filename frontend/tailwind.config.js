import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(configDir, "index.html"),
    path.join(configDir, "src/**/*.{js,jsx}"),
  ],
  theme: {
    extend: {
      colors: {
        navy: "#094873",
        teal: "#067A89",
        sidebar: "#083E5F",
        bg: "#FAF7F2",
        border: {
          DEFAULT: "#E8E2D8",
          soft: "#EEE7DA",
          softer: "#F0EBE1",
        },
        text: {
          primary: "#122B3D",
          strong: "#1C1B19",
          secondary: "#7A756C",
          muted: "#8A8478",
          tertiary: "#A39C8F",
        },
        chip: {
          inactive: "#F1EDE5",
          active: "#EAF3F5",
        },
      },
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        // Sans-serif with rounded stroke terminals (the T's strokes end in a
        // soft curve instead of a sharp flat corner) — used for all subtitle
        // / secondary text app-wide (bold titles stay on font-heading).
        body: ["Nunito", "sans-serif"],
        // Same typeface as font-body — kept as a separate alias so the
        // player/caption components can name their intent explicitly
        // without depending on body's definition matching.
        transcript: ["Nunito", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        thumb: "14px",
        detail: "18px",
      },
      boxShadow: {
        player: "0 -2px 12px rgba(0,0,0,0.05)",
        menu: "0 8px 24px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
