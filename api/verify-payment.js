/**
 * Verifies that Razorpay really sent the payment, using the HMAC signature.
 * Without this check anyone could fake a payment in the browser.
 *
 * Env vars required:
 *   RAZORPAY_KEY_SECRET
 */
import crypto from "node:crypto";
import { sign } from "./_auth.js";

const PRICE_DAYS = { monthly: 30, six_months: 180, yearly: 365 };

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

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "RAZORPAY_KEY_SECRET is not set" });
  }

  const body = req.body || {};
  const orderId = String(body.razorpay_order_id || "");
  const paymentId = String(body.razorpay_payment_id || "");
  const signature = String(body.razorpay_signature || "");
  const plan = String(body.plan || "monthly");

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: "Missing payment fields" });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!safeEqual(expected, signature)) {
    return res.status(400).json({ error: "Signature mismatch", verified: false });
  }

  const days = PRICE_DAYS[plan] || 30;
  const expiresAt = Date.now() + days * 86400000;

  /* The browser keeps this token but cannot forge it: it is signed with a
     secret that only exists in Vercel env vars. */
  const token = sign({ plan, exp: expiresAt, payment_id: paymentId, order_id: orderId });

  if (!token) {
    return res.status(500).json({ error: "Server signing secret is not configured" });
  }

  return res.status(200).json({
    verified: true,
    token,
    payment_id: paymentId,
    order_id: orderId,
    plan,
    days,
    expires_at: expiresAt,
  });
}