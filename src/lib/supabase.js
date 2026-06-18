// Supabase client. If env vars are absent we run in MOCK mode so the app
// still boots (and the prototype still demos) without a backend.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isMockMode = !url || !anonKey;

export const supabase = isMockMode ? null : createClient(url, anonKey);

if (isMockMode && typeof console !== "undefined") {
  console.info(
    "[Two-Do] Running in MOCK mode — set VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_ANON_KEY to connect a real Supabase project."
  );
}
