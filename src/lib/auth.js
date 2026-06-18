// Auth + first-run bootstrap. No-ops in mock mode (the app runs auth-less there).
import { supabase, isMockMode } from "./supabase.js";

export async function getSession() {
  if (isMockMode) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  if (isMockMode) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** Send a passwordless magic-link to `email`; the link returns to this origin. */
export async function signInWithMagicLink(email) {
  if (isMockMode) return { error: null };
  // Include the Vite base so the link returns to the app even under a subpath
  // (e.g. GitHub Pages /two-do/). BASE_URL is "/" locally, "/two-do/" on Pages.
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
}

export async function signOut() {
  if (!isMockMode) await supabase.auth.signOut();
}

/** Ensure the signed-in user has a space + people (creates them on first run). */
export async function ensureBootstrap(email) {
  if (isMockMode) return null;
  const name = email ? email.split("@")[0] : null;
  const { data, error } = await supabase.rpc("bootstrap_space", { p_display_name: name });
  if (error) throw error;
  return data;
}
