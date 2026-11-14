/**
 * Owner login. The code is checked here, never in the page source.
 *
 * POST { name, code }
 *   -> { ok: true, token }   on success
 *   -> { ok: false }         on failure
 *
 * Env vars required:
 *   OWNER_CODE     the secret owner code
 *   OWNER_NAME     optional, defaults to MAHESWARI
 */
import crypto from "node:crypto";
import { sign } from "./_auth.js";

const OWNER_YEARS = 100;

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const expectedCode = process.env.OWNER_CODE || "";
  const expectedName = (process.env.OWNER_NAME || "MAHESWARI").toUpperCase();

  if (!expectedCode) {
    return res.status(500).json({ ok: false, error: "OWNER_CODE is not set" });
  }

  const name = String((req.body && req.body.name) || "").trim().toUpperCase();
  const code = String((req.body && req.body.code) || "");

  const nameOk = safeEqual(name, expectedName);
  const codeOk = safeEqual(code, expectedCode);

  if (!nameOk || !codeOk) {
    return res.status(401).json({ ok: false, error: "Wrong owner name or code" });
  }

  const exp = Date.now() + OWNER_YEARS * 365 * 86400000;
  const token = sign({ owner: true, exp });

  if (!token) {
    return res.status(500).json({ ok: false, error: "Server signing secret is not configured" });
  }

  return res.status(200).json({ ok: true, token });
}