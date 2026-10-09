"use client";

const KEY = "ejp_studio_token";
/** The token lives in plain module memory first — storage is only a bonus, never a requirement. */
let memory = "";

function readStorage(store: () => Storage | null): string {
  try { return store()?.getItem(KEY) || ""; } catch { return ""; }
}

function writeStore(get: () => Storage | null, value: string) {
  try {
    if (value) get()?.setItem(KEY, value);
    else get()?.removeItem(KEY);
  } catch { /* storage blocked — memory keeps the session alive */ }
}

export function getStudioToken(): string {
  if (typeof window === "undefined") return "";
  if (memory) return memory;
  const stored = readStorage(() => window.sessionStorage) || readStorage(() => window.localStorage);
  if (stored) memory = stored;
  return stored;
}

export function setStudioToken(token: string) {
  memory = token;
  writeStore(() => sessionStorage, token);
  writeStore(() => localStorage, token);
}

export function clearStudioToken() {
  memory = "";
  writeStore(() => sessionStorage, "");
  writeStore(() => localStorage, "");
}

/** Every studio request carries the session token, so login works even when the browser blocks cookies and storage. */
export function studioFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = getStudioToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers, credentials: "same-origin" });
}
