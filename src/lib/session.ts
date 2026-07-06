// Mock auth session for v0. Stored in localStorage.
// Only pros still use this local session for legacy compatibility; real
// pro auth is via supabase.auth.signInWithPassword. Homeowners use real
// supabase.auth (magic link) - see useHomeownerGuard.

export type Session = { role: "pro"; proId: string };

const KEY = "hb_session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("hb_session_change"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("hb_session_change"));
}
