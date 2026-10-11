import { Router } from "express";
import bcrypt from "bcryptjs";
import { databaseConfigured, query } from "../db.js";
import { authenticateToken, isAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";

export const usersRouter = Router();

// Admin only. This endpoint used to be unauthenticated, which let anyone create an
// admin account for themselves. Public self-registration goes through /api/auth/register,
// which cannot mint an admin.
usersRouter.post("/api/users", authenticateToken, isAdmin, asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const { email, fullName, role = "customer", password } = request.body;
  if (!email || !fullName || !["customer", "vendor", "supplier", "admin"].includes(role)) return response.status(400).json({ error: "email, fullName, and a valid role are required." });
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;
  try {
    const result = await query("INSERT INTO users (email, full_name, role, password_hash, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, status, created_at", [email.toLowerCase(), fullName, role, passwordHash, role === "customer" || role === "admin" ? "active" : "pending_approval"]);
    const user = result.rows[0];
    delete user.password_hash;
    response.status(201).json({ user });
  } catch (error) {
    response.status(error.code === "23505" ? 409 : 500).json({ error: error.code === "23505" ? "An account with this email already exists." : "Internal server error" });
  }
}));

usersRouter.get("/api/users", authenticateToken, isAdmin, asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const page = Math.max(1, parseInt(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit) || 20));
  const offset = (page - 1) * limit;
  const countResult = await query("SELECT COUNT(*) FROM users");
  const total = parseInt(countResult.rows[0].count, 10);
  const result = await query(
    "SELECT id, email, full_name, role, status, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  response.json({ data: result.rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}));

usersRouter.patch("/api/users/:id/status", authenticateToken, isAdmin, asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const { status } = request.body;
  if (!["active", "suspended"].includes(status)) return response.status(400).json({ error: "Status must be active or suspended." });
  const result = await query(
    "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, status",
    [status, request.params.id]
  );
  if (!result.rows.length) return response.status(404).json({ error: "User not found." });
  return response.json({ user: result.rows[0] });
}));
