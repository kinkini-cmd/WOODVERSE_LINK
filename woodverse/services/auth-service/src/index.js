import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5004;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "auth-service" });
});

app.post("/login", (req, res) => {
  res.json({ ok: true, message: "Auth service login endpoint", user: req.body });
});

app.listen(port, () => {
  console.log(`Auth service running on http://localhost:${port}`);
});
