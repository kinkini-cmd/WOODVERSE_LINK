import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5006;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "production-service" });
});

app.get("/production", (req, res) => {
  res.json({ jobs: [{ id: "job-1", status: "queued", orderId: "ord-1" }] });
});

app.listen(port, () => {
  console.log(`Production service running on http://localhost:${port}`);
});
