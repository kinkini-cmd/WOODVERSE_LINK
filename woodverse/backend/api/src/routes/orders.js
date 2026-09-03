import { Router } from "express";
import { databaseConfigured, query } from "../db.js";
import { catalogProducts, orders } from "../data/memory.js";
import { currentTime } from "../utils/helpers.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import { createOrderIntake } from "../modules/order-intake/order-intake.js";

export const ordersRouter = Router();

const orderIntake = createOrderIntake({
  catalog: { listProducts: () => catalogProducts },
  orderStore: {
    async save({ input, order, status, fulfillmentPlan = order.fulfillmentPlan }) {
      orders.unshift(order);
      if (!databaseConfigured || !input.customerId) return null;

      const result = await query("INSERT INTO orders (customer_id, vendor_id, status, total_amount, requires_manufacturing, fulfillment_plan, shipping_address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [
        input.customerId,
        input.vendorId || null,
        status,
        input.totalAmount || 0,
        order.requiresVendorApproval,
        JSON.stringify(fulfillmentPlan),
        JSON.stringify(input.shippingAddress || {}),
      ]);
      return result.rows[0];
    },
  },
  notify: async ({ order, evaluation, input }) => {
    if (!input.io) return;
    input.io.to("woodverse-notifications").emit("notification:event", {
      id: `notice-${Date.now()}`,
      audience: "Vendor",
      source: "WoodVerse API",
      title: evaluation.requiresVendorApproval ? "Order needs vendor approval" : "New stock order",
      message: evaluation.requiresVendorApproval
        ? `${order.id} has items that must be manufactured before delivery.`
        : `${order.id} can be fulfilled from stock.`,
      time: currentTime(),
    });
  },
});

ordersRouter.post("/api/orders/evaluate-stock", authenticateToken, (request, response) => {
  response.json(orderIntake.evaluate(request.body.items || []));
});

ordersRouter.post("/api/orders", authenticateToken, authorizeRoles("customer", "vendor", "admin"), (request, response) => {
  orderIntake.accept({ ...request.body, io: request.io })
    .then((order) => response.status(201).json(order))
    .catch((error) => response.status(500).json({ error: error.message }));
});

ordersRouter.get("/api/orders", authenticateToken, authorizeRoles("admin", "vendor", "customer"), async (request, response) => {
  if (!databaseConfigured) return response.json({ orders });
  try {
    let result;
    if (request.user.role === "customer") {
      result = await query("SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC", [request.user.id]);
    } else if (request.user.role === "vendor") {
      const vendorResult = await query("SELECT id FROM vendors WHERE user_id = $1", [request.user.id]);
      const vendorId = vendorResult.rows[0]?.id;
      result = await query("SELECT * FROM orders WHERE vendor_id = $1 ORDER BY created_at DESC", [vendorId]);
    } else {
      result = await query("SELECT * FROM orders ORDER BY created_at DESC");
    }
    response.json({ orders: result.rows });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});
