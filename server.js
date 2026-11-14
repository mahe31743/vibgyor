import express from "express";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import path from "node:path";
import createOrder from "./api/create-order.js";
import ownerLogin from "./api/owner-login.js";
import session from "./api/session.js";
import verifyPayment from "./api/verify-payment.js";

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.post("/api/create-order", createOrder);
app.post("/api/owner-login", ownerLogin);
app.post("/api/session", session);
app.post("/api/verify-payment", verifyPayment);

app.get("/", (_req, res) => res.sendFile(path.join(root, "index.html")));

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`VIBGYOR server listening on port ${port}`);
});
