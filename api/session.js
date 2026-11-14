/**
 * Returns the visitor's real entitlement, verified against a signed token.
 *
 * POST { token }
 *   -> { ok: true, owner, plan, expires_at }   when the token is valid and live
 *   -> { ok: false, expired: true }            when the token is valid but expired
 *   -> { ok: false, trial, trial_ends }        when there is no usable token
 *
 * The trial is anchored in an HttpOnly cookie, so clearing localStorage cannot
 * restart it. Paid access can only come from a token signed by verify-payment.
 */
import { unsign, isLive, sign } from "./_auth.js";

const TRIAL_DAYS = 7;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const token = String((req.body && req.body.token) || "");
  const claims = unsign(token);

  if (claims && isLive(claims)) {
    if (claims.owner) {
      return res.status(200).json({ ok: true, owner: true, plan: "OWNER", expires_at: claims.exp });
    }
    return res.status(200).json({ ok: true, plan: claims.plan || "PREMIUM", expires_at: claims.exp });
  }

  if (claims) {
    return res.status(200).json({ ok: false, expired: true });
  }

  const existing = parseInt((req.cookies && req.cookies.vibgyor_trial) || "", 10);
  const started = Number.isFinite(existing) && existing > 0 ? existing : Date.now();

  if (!Number.isFinite(existing) || existing <= 0) {
    res.setHeader(
      "Set-Cookie",
      `vibgyor_trial=${started}; Path=/; Max-Age=${365 * 86400}; HttpOnly; Secure; SameSite=Lax`
    );
  }

  const trialEnds = started + TRIAL_DAYS * 86400000;
  const tokenOut = sign({ trial: true, exp: trialEnds });

  return res.status(200).json({
    ok: false,
    trial: true,
    trial_ends: trialEnds,
    trial_token: tokenOut,
  });
}