import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5008;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "notifications-service" });
});

app.post("/notifications", (req, res) => {
  res.status(201).json({ ok: true, message: "Notification sent", payload: req.body });
});

app.listen(port, () => {
  console.log(`Notifications service running on http://localhost:${port}`);
});
