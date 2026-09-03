import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5005;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "inventory-service" });
});

app.get("/inventory", (req, res) => {
  res.json({ inventory: [{ sku: "SKU-100", available: 24 }, { sku: "SKU-200", available: 12 }] });
});

app.listen(port, () => {
  console.log(`Inventory service running on http://localhost:${port}`);
});
