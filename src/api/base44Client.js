/**
 * Base44 Client
 *
 * In live deployments (Base44 builder) this file is bundled with the
 * Base44 SDK so OAuth providers (Google, Apple) work correctly.
 *
 * For LOCAL development with the Express backend, swap this file with
 * src/api/base44Client.local.js before starting the dev server.
 *    cp src/api/base44Client.local.js src/api/base44Client.js
 *
 * The .env entry VITE_HAVEN_BACKEND controls only the Vite dev proxy
 * target, not which client is imported — the build system cannot handle
 * two different import graphs behind a runtime flag.
 */

import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
});

const TOKEN_KEY = 'base44_access_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY) || null;
}

export function setToken(val) {
  if (typeof window === 'undefined') return;
  val
    ? window.localStorage.setItem(TOKEN_KEY, val)
    : window.localStorage.removeItem(TOKEN_KEY);
}