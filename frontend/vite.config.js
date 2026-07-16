import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // The upstream feed (/api/classes) changes hourly and is fetched by
      // the app itself via fetch(), not via a page navigation, so it's
      // deliberately left out of the service worker's precache/runtime
      // caching here — we only want the app SHELL (JS/CSS/icons) to work
      // offline/install reliably, not to serve stale class data.
      manifest: {
        name: "The Torah Center of Atlanta",
        short_name: "Torah Center",
        description: "Browse and watch/listen to classes from The Torah Center of Atlanta.",
        start_url: "/",
        display: "standalone",
        background_color: "#FAF7F2",
        theme_color: "#094873",
        icons: [
          { src: "/icon.png", sizes: "512x512", type: "image/png" },
          { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
