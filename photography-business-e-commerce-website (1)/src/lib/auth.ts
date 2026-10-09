import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const cookieName = "ejp_admin";
/** Studio password. Override with ADMIN_PASSWORD in the environment for production. */
const adminPassword = () => process.env.ADMIN_PASSWORD || "admin";
/** Fixed signing key so sessions survive restarts. Override with ADMIN_SESSION_SECRET. */
function secret() { return process.env.ADMIN_SESSION_SECRET || "ejp-studio-session-key-v1"; }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }

export function createSessionToken() {
  const expires = String(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | null | undefined) {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expires = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now() || !/^[a-f0-9]+$/i.test(signature)) return false;
  const expected = sign(expires);
  try { return signature.length === expected.length && timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex")); } catch { return false; }
}

function tokenFromRequest(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("x-studio-token");
  if (!header) return null;
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header.trim();
}

/** Accepts the HttpOnly cookie or a bearer token. The token is what works inside the preview iframe, where third-party cookies are blocked. */
export async function isAdminRequest(req: Request) {
  if (verifySessionToken(tokenFromRequest(req))) return true;
  return verifySessionToken((await cookies()).get(cookieName)?.value);
}

export async function isAdmin() {
  return verifySessionToken((await cookies()).get(cookieName)?.value);
}

export function verifyPassword(input: string) {
  const a = Buffer.from(input); const b = Buffer.from(adminPassword());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAdminCookie(token: string) {
  const jar = await cookies();
  const base = { httpOnly: true, secure: true, path: "/", maxAge: 30 * 24 * 60 * 60 } as const;
  try { jar.set(cookieName, token, { ...base, sameSite: "none", partitioned: true }); }
  catch { try { jar.set(cookieName, token, { ...base, sameSite: "none" }); } catch { /* bearer token is the session that counts */ } }
}

export async function clearAdminCookie() { (await cookies()).delete(cookieName); }
