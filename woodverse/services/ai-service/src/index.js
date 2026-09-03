import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5009;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "ai-service" });
});

app.post("/ai/intent", (req, res) => {
  const intent = req.body?.message || "catalog_query";

  res.json({
    ok: true,
    intent,
    suggestedAction: "lookup_catalog",
    confidence: 0.88
  });
});

app.listen(port, () => {
  console.log(`AI service running on http://localhost:${port}`);
});
