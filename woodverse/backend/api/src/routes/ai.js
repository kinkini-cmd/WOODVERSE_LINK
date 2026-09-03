import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { aiAdapter } from "../modules/ai/ai-adapter.js";

export const aiRouter = Router();

aiRouter.post("/api/ai/chat", authenticateToken, async (request, response) => {
  const result = await aiAdapter.chat(request.body);
  response.json(result);
});

aiRouter.post("/api/ai/stock-decision", authenticateToken, async (request, response) => {
  const result = await aiAdapter.stockDecision(request.body);
  response.json(result);
});
