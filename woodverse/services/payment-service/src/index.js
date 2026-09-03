import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5007;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "payment-service" });
});

app.post("/payments", (req, res) => {
  res.status(201).json({ ok: true, paymentStatus: "captured", data: req.body });
});

app.listen(port, () => {
  console.log(`Payment service running on http://localhost:${port}`);
});
