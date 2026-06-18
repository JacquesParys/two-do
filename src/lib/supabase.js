// Supabase client. If env vars are absent we run in MOCK mode so the app
// still boots (and the prototype still demos) without a backend.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isMockMode = !url || !anonKey;

// "Remember me": persist the session in localStorage (survives browser restarts)
// when on, else sessionStorage (cleared when the browser closes). The preference
// itself lives in localStorage so we can route token storage at read time.
const REMEMBER_KEY = "twodo.remember";
export function setRemember(on) { try { localStorage.setItem(REMEMBER_KEY, on ? "1" : "0"); } catch {} }
function store() {
  try { return localStorage.getItem(REMEMBER_KEY) === "0" ? sessionStorage : localStorage; } catch { return localStorage; }
}
const hybridStorage = {
  getItem: (k) => { try { return store().getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { store().setItem(k, v); } catch {} },
  removeItem: (k) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} },
};

export const supabase = isMockMode
  ? null
  : createClient(url, anonKey, {
      auth: { storage: hybridStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

if (isMockMode && typeof console !== "undefined") {
  console.info(
    "[Two-Do] Running in MOCK mode — set VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_ANON_KEY to connect a real Supabase project."
  );
}
