import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA scaffolding stood up in Phase 0 so push (Phase 2) has a home.
// `base` defaults to "/" (local + root-domain hosts like Vercel/Netlify); CI sets
// BASE_PATH=/two-do/ for GitHub Pages (served under the repo subpath).
export default defineConfig({
  base: process.env.BASE_PATH || "/",
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
        // No icon assets yet — leave empty to avoid 404s in the console. Add real
        // icons to public/ and reference them here for installable-PWA branding.
        icons: []
      },
      workbox: {
        // Empty runtime caching for now; the push handler lands in Phase 2.
        globPatterns: ["**/*.{js,css,html,woff2}"]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks: smaller app chunk, and the
        // browser keeps these cached when only our code changes (clears the
        // >500 kB single-bundle warning too).
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@dnd-kit")) return "dndkit";
          if (id.includes("emoji-mart")) return "emoji";
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          return "vendor";
        }
      }
    }
  },
  test: {
    environment: "node",
    // Force MOCK mode in unit tests even when .env.local has real Supabase creds.
    env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" }
  }
});
