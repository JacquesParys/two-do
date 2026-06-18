import { useState, useEffect } from "react";
import { COLORS, TYPE, RADIUS, ensureFonts } from "./theme";
import { isMockMode } from "./lib/supabase.js";
import { getSession, onAuthChange, signUp, signInWithPassword, setRemember, ensureBootstrap } from "./lib/auth.js";
import TwoDoShell from "./TwoDoShell.jsx";

ensureFonts();

// Mock mode runs auth-less (current dev behavior); real Supabase gets the gate.
export default function AuthGate() {
  if (isMockMode) return <TwoDoShell />;
  return <RealAuthGate />;
}

function Centered({ children }) {
  return (
    <div style={{ height: "100dvh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: COLORS.textPrimary, marginBottom: 8 }}>Two-Do</div>
        {children}
      </div>
    </div>
  );
}

function RealAuthGate() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSession().then(setSession);
    return onAuthChange(setSession);
  }, []);

  useEffect(() => {
    if (!session) { setReady(false); return; }
    setError(null);
    ensureBootstrap(session.user?.email).then(() => setReady(true)).catch((e) => setError(e.message || String(e)));
  }, [session]);

  if (session === undefined) return <Centered><p style={muted}>Loading…</p></Centered>;
  if (!session) return <SignIn />;
  if (error) return (
    <Centered>
      <p style={muted}>Couldn’t set up your space.</p>
      <p style={{ ...muted, color: COLORS.accent, fontStyle: "normal" }}>{error}</p>
    </Centered>
  );
  if (!ready) return <Centered><p style={muted}>Setting things up…</p></Centered>;
  return <TwoDoShell />;
}

function SignIn() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRem] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function submit() {
    const e = email.trim();
    if (!e || !password || busy) return;
    setBusy(true); setError(null); setInfo(null);
    setRemember(remember);
    const { data, error } = mode === "signup" ? await signUp(e, password) : await signInWithPassword(e, password);
    setBusy(false);
    if (error) { setError(error.message); return; }
    if (mode === "signup" && data && !data.session) {
      setInfo("Account created — confirm via the email we sent, then sign in.");
      setMode("signin");
    }
    // On success with a session, onAuthChange advances the gate automatically.
  }

  return (
    <Centered>
      <p style={{ ...muted, marginBottom: 18 }}>{mode === "signup" ? "Create an account to sync with your partner." : "Sign in to sync with your partner."}</p>
      <input type="email" value={email} autoFocus autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={field} />
      <input type="password" value={password} autoComplete={mode === "signup" ? "new-password" : "current-password"} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" style={field} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, ...TYPE.meta, color: COLORS.textSecondary, margin: "2px 0 14px", cursor: "pointer" }}>
        <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} style={{ accentColor: COLORS.accent }} /> Keep me signed in
      </label>
      <button onClick={submit} disabled={busy} className="pressable focusable" style={{ width: "100%", padding: "12px", borderRadius: RADIUS.md, border: "none", background: COLORS.accent, color: COLORS.bg, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
        {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      {error && <p style={{ ...muted, color: COLORS.accent, marginTop: 10 }}>{error}</p>}
      {info && <p style={{ ...muted, marginTop: 10 }}>{info}</p>}
      <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); setInfo(null); }} className="focusable" style={{ background: "none", border: "none", color: COLORS.textSecondary, cursor: "pointer", marginTop: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 13, textDecoration: "underline" }}>
        {mode === "signup" ? "Have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </Centered>
  );
}

const field = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.surfaceLight}`, background: COLORS.surface, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none", caretColor: COLORS.accent, marginBottom: 10 };
const muted = { ...TYPE.body, fontFamily: "'Fraunces', serif", fontStyle: "italic", color: COLORS.textMuted };
