import { useState, useEffect } from "react";
import { COLORS, TYPE, SPACE, RADIUS, ensureFonts } from "./theme";
import { isMockMode } from "./lib/supabase.js";
import { getSession, onAuthChange, signInWithMagicLink, ensureBootstrap } from "./lib/auth.js";
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    const e = email.trim();
    if (!e || busy) return;
    setBusy(true); setError(null);
    const { error } = await signInWithMagicLink(e);
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) return (
    <Centered>
      <p style={{ ...TYPE.body, color: COLORS.textPrimary }}>Check your email.</p>
      <p style={muted}>We sent a sign-in link to <b style={{ color: COLORS.textSecondary }}>{email}</b>. Open it on this device.</p>
    </Centered>
  );

  return (
    <Centered>
      <p style={{ ...muted, marginBottom: 18 }}>Sign in to sync with your partner.</p>
      <input
        type="email" value={email} autoFocus
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="you@example.com"
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: RADIUS.md, border: `1px solid ${COLORS.surfaceLight}`, background: COLORS.surface, color: COLORS.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none", caretColor: COLORS.accent, marginBottom: 10 }}
      />
      <button
        onClick={submit} disabled={busy} className="pressable focusable"
        style={{ width: "100%", padding: "12px", borderRadius: RADIUS.md, border: "none", background: COLORS.accent, color: COLORS.bg, fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "Sending…" : "Email me a link"}
      </button>
      {error && <p style={{ ...muted, color: COLORS.accent, marginTop: 10 }}>{error}</p>}
    </Centered>
  );
}

const muted = { ...TYPE.body, fontFamily: "'Fraunces', serif", fontStyle: "italic", color: COLORS.textMuted };
