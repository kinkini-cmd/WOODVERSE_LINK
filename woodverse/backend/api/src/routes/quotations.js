import { Router } from "express";
import { databaseConfigured, query } from "../db.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";

export const quotationsRouter = Router();

quotationsRouter.post("/api/quotations", authenticateToken, authorizeRoles("vendor", "admin"), async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });

  const { orderId, customerId, vendorId, amount = 0, notes, validUntil } = request.body;
  try {
    let effectiveCustomerId = customerId || null;
    let effectiveVendorId = vendorId || null;

    if (request.user.role === "vendor") {
      const vendorResult = await query("SELECT id FROM vendors WHERE user_id = $1", [request.user.id]);
      const vendorProfile = vendorResult.rows[0];
      if (!vendorProfile) {
        return response.status(403).json({ error: "Vendor profile not found for the authenticated account." });
      }
      effectiveVendorId = vendorProfile.id;

      if (vendorId && String(vendorId) !== String(effectiveVendorId)) {
        return response.status(403).json({ error: "Vendor ID does not match the authenticated vendor account." });
      }

      if (orderId) {
        const orderResult = await query("SELECT id, customer_id, vendor_id FROM orders WHERE id = $1", [orderId]);
        const order = orderResult.rows[0];
        if (!order) {
          return response.status(404).json({ error: "Order not found." });
        }

        effectiveCustomerId = order.customer_id;

        if (customerId && String(customerId) !== String(order.customer_id)) {
          return response.status(403).json({ error: "Order does not belong to the supplied customer." });
        }

        if (String(order.vendor_id) !== String(effectiveVendorId)) {
          return response.status(403).json({ error: "Order does not belong to the authenticated vendor." });
        }
      }

      if (!effectiveCustomerId) {
        return response.status(400).json({ error: "customerId is required." });
      }
    } else if (request.user.role === "admin") {
      if (orderId) {
        const orderResult = await query("SELECT id, customer_id, vendor_id FROM orders WHERE id = $1", [orderId]);
        const order = orderResult.rows[0];
        if (!order) {
          return response.status(404).json({ error: "Order not found." });
        }
        effectiveCustomerId = customerId || order.customer_id;
        if (customerId && String(customerId) !== String(order.customer_id)) {
          return response.status(403).json({ error: "Order does not belong to the supplied customer." });
        }
        if (vendorId && order.vendor_id && String(vendorId) !== String(order.vendor_id)) {
          return response.status(403).json({ error: "Order does not belong to the supplied vendor." });
        }

        effectiveVendorId = vendorId || order.vendor_id;
      }
    }

    if (!effectiveCustomerId || !effectiveVendorId) {
      return response.status(400).json({ error: "customerId and vendorId are required." });
    }

    const result = await query(
      "INSERT INTO quotations (order_id, customer_id, vendor_id, amount, notes, valid_until, status) VALUES ($1, $2, $3, $4, $5, $6, 'sent') RETURNING *",
      [orderId || null, effectiveCustomerId, effectiveVendorId, amount, notes || null, validUntil || null]
    );
    response.status(201).json({ quotation: result.rows[0] });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  }
});

quotationsRouter.get("/api/quotations", authenticateToken, authorizeRoles("admin", "vendor", "customer"), asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const page = Math.max(1, parseInt(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit) || 20));
  const offset = (page - 1) * limit;

  let result;
  let total;
  if (request.user.role === "customer") {
    const countResult = await query("SELECT COUNT(*) FROM quotations WHERE customer_id = $1", [request.user.id]);
    total = parseInt(countResult.rows[0].count, 10);
    result = await query(
      "SELECT * FROM quotations WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [request.user.id, limit, offset]
    );
  } else if (request.user.role === "vendor") {
    const vendorResult = await query("SELECT id FROM vendors WHERE user_id = $1", [request.user.id]);
    const vendorId = vendorResult.rows[0]?.id;
    if (!vendorId) {
      return response.status(403).json({ error: "Vendor profile not found for the authenticated account." });
    }
    const countResult = await query("SELECT COUNT(*) FROM quotations WHERE vendor_id = $1", [vendorId]);
    total = parseInt(countResult.rows[0].count, 10);
    result = await query(
      "SELECT * FROM quotations WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [vendorId, limit, offset]
    );
  } else {
    const countResult = await query("SELECT COUNT(*) FROM quotations");
    total = parseInt(countResult.rows[0].count, 10);
    result = await query(
      "SELECT * FROM quotations ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
  }
  response.json({ data: result.rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } });
}));

quotationsRouter.patch("/api/quotations/:id", authenticateToken, authorizeRoles("customer", "vendor", "admin"), asyncHandler(async (request, response) => {
  if (!databaseConfigured) return response.status(503).json({ error: "PostgreSQL is not configured." });
  const { id } = request.params;
  const quotResult = await query("SELECT * FROM quotations WHERE id = $1", [id]);
  const quot = quotResult.rows[0];
  if (!quot) return response.status(404).json({ error: "Quotation not found." });
  const { status, amount, notes } = request.body;
  if (request.user.role === "customer") {
    if (String(quot.customer_id) !== String(request.user.id)) return response.status(403).json({ error: "Not your quotation." });
    if (!["accepted", "declined"].includes(status)) return response.status(400).json({ error: "Customer can only accept or decline." });
    const result = await query("UPDATE quotations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, id]);
    return response.json({ quotation: result.rows[0] });
  }
  if (request.user.role === "vendor") {
    const vendorResult = await query("SELECT id FROM vendors WHERE user_id = $1", [request.user.id]);
    const vendorId = vendorResult.rows[0]?.id;
    if (!vendorId || String(quot.vendor_id) !== String(vendorId)) return response.status(403).json({ error: "Not your quotation." });
    if (quot.status !== "sent" && quot.status !== "draft") return response.status(400).json({ error: "Can only update a pending quotation." });
    const fields = [];
    const values = [];
    if (amount !== undefined) { fields.push("amount = $" + (values.length + 1)); values.push(amount); }
    if (notes !== undefined) { fields.push("notes = $" + (values.length + 1)); values.push(notes); }
    if (!fields.length) return response.status(400).json({ error: "No fields to update." });
    fields.push("updated_at = NOW()");
    values.push(id);
    const result = await query("UPDATE quotations SET " + fields.join(", ") + " WHERE id = $" + values.length + " RETURNING *", values);
    return response.json({ quotation: result.rows[0] });
  }
  return response.status(403).json({ error: "Insufficient permissions." });
}));
