import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5003;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "order-service" });
});

app.get("/orders", (req, res) => {
  res.json({
    orders: [
      { id: "ord-1", customer: "Customer A", status: "vendor_approval" },
      { id: "ord-2", customer: "Customer B", status: "processing" }
    ]
  });
});

app.post("/orders", (req, res) => {
  res.status(201).json({
    ok: true,
    message: "Order created by order service",
    order: req.body
  });
});

app.listen(port, () => {
  console.log(`Order service running on http://localhost:${port}`);
});
