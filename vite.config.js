import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA scaffolding stood up in Phase 0 so push (Phase 2) has a home.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Two-Do",
        short_name: "Two-Do",
        description: "A shared planning app for two people with ADHD.",
        theme_color: "#1B2B2B",
        background_color: "#1B2B2B",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        // Empty runtime caching for now; the push handler lands in Phase 2.
        globPatterns: ["**/*.{js,css,html,woff2}"]
      }
    })
  ],
  test: {
    environment: "node"
  }
});
