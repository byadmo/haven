/**
 * Base44 Client Dispatcher
 *
 * Default to Base44 SDK (safe for deployments — OAuth works). Falls back
 * to the local Express backend when VITE_HAVEN_BACKEND=local in .env.
 */

const BACKEND = import.meta.env.VITE_HAVEN_BACKEND;
const TOKEN_KEY = 'base44_access_token';

// Token helpers — shared by both modes, read/write localStorage.
function readToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY) || null;
}

function writeToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

let base44;

if (BACKEND === 'local') {
  // ---- LOCAL MODE: Express + SQLite ----
  const mod = await import('./base44Client.local.js');
  base44 = mod.base44;
} else {
  // ---- BASE44 MODE: hosted backend + real OAuth ----
  const mod = await import('./base44Client.base44.js');
  base44 = mod.base44;
}

export { base44, readToken as getToken, writeToken as setToken };