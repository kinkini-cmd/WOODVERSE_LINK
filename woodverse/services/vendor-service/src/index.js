import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5002;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "vendor-service" });
});

app.get("/vendors", (req, res) => {
  res.json({
    vendors: [
      { id: "v-1", businessName: "Moratuwa Crafts", status: "approved" },
      { id: "v-2", businessName: "Ceylon Woods", status: "approved" }
    ]
  });
});

app.listen(port, () => {
  console.log(`Vendor service running on http://localhost:${port}`);
});
