/**
 * Signs and verifies entitlement tokens.
 *
 * The signing secret lives only in Vercel env vars, so a token stored in the
 * browser cannot be forged or edited. This is what makes localStorage safe to
 * use as a cache: it is never trusted on its own.
 *
 * Env var required:
 *   VIBGYOR_SESSION_SECRET   any long random string (falls back to RAZORPAY_KEY_SECRET)
 */
import crypto from "node:crypto";

function secret() {
  return process.env.VIBGYOR_SESSION_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
}

export function sign(payload) {
  const key = secret();
  if (!key) return null;
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const mac = crypto.createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function unsign(token) {
  const key = secret();
  if (!key || !token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, mac] = parts;
  const expected = crypto.createHmac("sha256", key).update(body).digest("base64url");

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!claims || typeof claims !== "object") return null;
    if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function isLive(claims) {
  return !!claims && claims.exp > Date.now();
}