import { Router } from "express";
import { databaseConfigured, query } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";

export const messagesRouter = Router();

messagesRouter.post("/api/messages", authenticateToken, asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const { senderId, recipientId, threadId, body } = request.body;
  if (!senderId || !recipientId || !body) return response.status(400).json({ error: "senderId, recipientId, and body are required." });
  if (senderId !== request.user.id) {
    return response.status(403).json({ error: "senderId must match the authenticated user." });
  }
  const result = await query("INSERT INTO messages (sender_id, recipient_id, thread_id, body) VALUES ($1, $2, COALESCE($3, gen_random_uuid()), $4) RETURNING *", [senderId, recipientId, threadId || null, body]);
  response.status(201).json({ message: result.rows[0] });
}));

messagesRouter.get("/api/messages", authenticateToken, asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const page = Math.max(1, parseInt(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit) || 20));
  const offset = (page - 1) * limit;

  const values = [];
  const whereClauses = [];
  let paramIndex = 1;

  if (request.query.threadId) {
    whereClauses.push(`thread_id = $${paramIndex++}`);
    values.push(request.query.threadId);
  }

  whereClauses.push(`(sender_id = $${paramIndex++} OR recipient_id = $${paramIndex++})`);
  values.push(request.user.id, request.user.id);

  const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countResult = await query(`SELECT COUNT(*) FROM messages ${where}`, values);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataValues = [...values, limit, offset];
  const result = await query(
    `SELECT * FROM messages ${where} ORDER BY created_at ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    dataValues
  );
  response.json({ data: result.rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}));

messagesRouter.patch("/api/messages/:id/read", authenticateToken, asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const msgResult = await query("SELECT * FROM messages WHERE id = $1", [request.params.id]);
  const msg = msgResult.rows[0];
  if (!msg) return response.status(404).json({ error: "Message not found." });
  if (String(msg.recipient_id) !== String(request.user.id) && request.user.role !== "admin") {
    return response.status(403).json({ error: "Not your message." });
  }
  const result = await query("UPDATE messages SET read_at = NOW() WHERE id = $1 RETURNING *", [request.params.id]);
  return response.json({ message: result.rows[0] });
}));
