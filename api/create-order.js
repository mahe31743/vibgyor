/**
 * Creates a Razorpay order. The amount is decided here on the server from a
 * fixed price table, so the browser can never change what it pays.
 *
 * Env vars required (Vercel -> Project -> Settings -> Environment Variables):
 *   RAZORPAY_KEY_ID      rzp_live_xxx  (or rzp_test_xxx while testing)
 *   RAZORPAY_KEY_SECRET  the secret from the same Razorpay dashboard
 */

const PRICES = {
  monthly: { amount: 39900, days: 30, label: "1 Month" },
  six_months: { amount: 159900, days: 180, label: "6 Months" },
  yearly: { amount: 259900, days: 365, label: "1 Year" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return res.status(500).json({ error: "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set" });
  }

  let plan = "";
  try {
    plan = String((req.body && req.body.plan) || "");
  } catch (err) {
    plan = "";
  }

  const price = PRICES[plan];
  if (!price) {
    return res.status(400).json({ error: "Unknown plan", plans: Object.keys(PRICES) });
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: price.amount,
        currency: "INR",
        receipt: `vibgyor_${plan}_${Date.now()}`,
        notes: { plan, label: price.label, days: String(price.days) },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Razorpay refused the order",
        detail: data && data.error ? data.error : data,
      });
    }

    return res.status(200).json({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id: keyId,
      plan,
      days: price.days,
      label: price.label,
    });
  } catch (err) {
    return res.status(502).json({ error: "Could not reach Razorpay", detail: String(err) });
  }
}