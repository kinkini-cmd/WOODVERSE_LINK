import { Router } from "express";
import { databaseConfigured, query } from "../db.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";

export const vendorsRouter = Router();

vendorsRouter.post("/api/vendors", authenticateToken, authorizeRoles("vendor", "admin"), asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const { userId, businessName, registrationNumber, description, documents = [] } = request.body;
  const effectiveUserId = request.user.role === "admin" ? userId : request.user.id;

  if (!effectiveUserId || !businessName) {
    return response.status(400).json({ error: "userId and businessName are required." });
  }

  if (request.user.role !== "admin") {
    if (userId && String(userId) !== String(request.user.id)) {
      return response.status(403).json({ error: "You can only create a vendor profile for your own account." });
    }

    const vendorResult = await query("SELECT id, user_id FROM vendors WHERE user_id = $1", [request.user.id]);
    const existing = vendorResult.rows[0];
    if (existing) {
      return response.status(403).json({ error: "A vendor profile already exists for this account." });
    }
  } else {
    const userResult = await query("SELECT id FROM users WHERE id = $1", [effectiveUserId]);
    if (userResult.rows.length === 0) {
      return response.status(404).json({ error: "User not found." });
    }
  }

  const result = await query(
    "INSERT INTO vendors (user_id, business_name, registration_number, description, documents) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [effectiveUserId, businessName, registrationNumber || null, description || null, JSON.stringify(documents)]
  );
  response.status(201).json({ vendor: result.rows[0] });
}));

vendorsRouter.get("/api/vendors", authenticateToken, asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const page = Math.max(1, parseInt(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit) || 20));
  const offset = (page - 1) * limit;
  const countResult = await query("SELECT COUNT(*) FROM vendors v JOIN users u ON u.id = v.user_id");
  const total = parseInt(countResult.rows[0].count, 10);
  const result = await query(
    "SELECT v.*, u.email, u.full_name FROM vendors v JOIN users u ON u.id = v.user_id ORDER BY v.created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  response.json({ data: result.rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}));
