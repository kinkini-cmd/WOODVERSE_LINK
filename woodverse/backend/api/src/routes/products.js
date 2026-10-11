import { Router } from "express";
import { databaseConfigured, query } from "../db.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";

export const productsRouter = Router();

productsRouter.post("/api/products", authenticateToken, authorizeRoles("vendor", "admin"), asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const { vendorId, name, description, category, material, price = 0, stockQuantity = 0, imageUrl } = request.body;
  if (!vendorId || !name) return response.status(400).json({ error: "vendorId and name are required." });

  if (request.user.role !== "admin") {
    const vendorResult = await query("SELECT id, user_id FROM vendors WHERE id = $1", [vendorId]);
    const vendor = vendorResult.rows[0];
    if (!vendor || vendor.user_id !== request.user.id) {
      return response.status(403).json({ error: "You can only create products for your own vendor account." });
    }
  }

  const result = await query("INSERT INTO products (vendor_id, name, description, category, material, price, stock_quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *", [vendorId, name, description || null, category || null, material || null, price, stockQuantity, imageUrl || null]);
  response.status(201).json({ product: result.rows[0] });
}));

productsRouter.get("/api/products", asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const page = Math.max(1, parseInt(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit) || 20));
  const offset = (page - 1) * limit;
  const countResult = await query("SELECT COUNT(*) FROM products p JOIN vendors v ON v.id = p.vendor_id");
  const total = parseInt(countResult.rows[0].count, 10);
  const result = await query(
    "SELECT p.*, v.business_name AS vendor_name FROM products p JOIN vendors v ON v.id = p.vendor_id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  response.json({ data: result.rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}));

productsRouter.patch("/api/products/:id", authenticateToken, authorizeRoles("vendor", "admin"), asyncHandler(async (req, res) => {
  if (!databaseConfigured) return res.status(503).json({ error: "PostgreSQL is not configured." });
  const prodResult = await query("SELECT * FROM products WHERE id = $1", [req.params.id]);
  const product = prodResult.rows[0];
  if (!product) return res.status(404).json({ error: "Product not found." });
  if (req.user.role !== "admin") {
    const vendorResult = await query("SELECT id FROM vendors WHERE user_id = $1", [req.user.id]);
    const vendorId = vendorResult.rows[0]?.id;
    if (!vendorId || String(product.vendor_id) !== String(vendorId)) {
      return res.status(403).json({ error: "You can only update your own products." });
    }
  }
  const { name, description, price, stockQuantity, images } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push("name = $" + (values.length + 1)); values.push(name); }
  if (description !== undefined) { fields.push("description = $" + (values.length + 1)); values.push(description); }
  if (price !== undefined) { fields.push("price = $" + (values.length + 1)); values.push(price); }
  if (stockQuantity !== undefined) { fields.push("stock_quantity = $" + (values.length + 1)); values.push(stockQuantity); }
  if (!fields.length) return res.status(400).json({ error: "No fields to update." });
  fields.push("updated_at = NOW()");
  values.push(req.params.id);
  const result = await query("UPDATE products SET " + fields.join(", ") + " WHERE id = $" + values.length + " RETURNING *", values);
  return res.json({ product: result.rows[0] });
}));

productsRouter.delete("/api/products/:id", authenticateToken, authorizeRoles("vendor", "admin"), asyncHandler(async (req, res) => {
  if (!databaseConfigured) return res.status(503).json({ error: "PostgreSQL is not configured." });
  const prodResult = await query("SELECT * FROM products WHERE id = $1", [req.params.id]);
  const product = prodResult.rows[0];
  if (!product) return res.status(404).json({ error: "Product not found." });
  if (req.user.role !== "admin") {
    const vendorResult = await query("SELECT id FROM vendors WHERE user_id = $1", [req.user.id]);
    const vendorId = vendorResult.rows[0]?.id;
    if (!vendorId || String(product.vendor_id) !== String(vendorId)) {
      return res.status(403).json({ error: "You can only delete your own products." });
    }
  }
  await query("DELETE FROM products WHERE id = $1", [req.params.id]);
  return res.status(204).send();
}));
