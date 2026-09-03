import { buildFulfillmentPlan } from "../../utils/helpers.js";

export class OrderIntakeError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function createOrderIntake({ catalog, orderStore, notify, now = () => new Date(), createId = () => `ORD-${Date.now()}` }) {
  if (!catalog || !orderStore || !notify) {
    throw new Error("Order intake requires catalog, orderStore, and notify adapters");
  }

  return {
    evaluate(items = []) {
      const fulfillmentPlan = buildFulfillmentPlan(items, catalog.listProducts());
      return summarizeFulfillment(fulfillmentPlan);
    },

    async accept(input = {}) {
      const evaluation = this.evaluate(input.items || []);
      const order = {
        id: createId(),
        customer: input.customer || "WoodVerse Customer",
        status: evaluation.requiresVendorApproval ? "Vendor Approval" : "Processing",
        requiresVendorApproval: evaluation.requiresVendorApproval,
        productionTrackingRequired: evaluation.productionTrackingRequired,
        fulfillmentPlan: evaluation.fulfillmentPlan,
        createdAt: now().toISOString(),
      };

      const persisted = await orderStore.save({
        input,
        order,
        status: evaluation.requiresVendorApproval ? "vendor_approval" : "processing",
      });
      await notify({ order, evaluation, input });
      return persisted || order;
    }
  };
}

function summarizeFulfillment(fulfillmentPlan) {
  return {
    requiresVendorApproval: fulfillmentPlan.some((item) => item.vendorApprovalRequired),
    productionTrackingRequired: fulfillmentPlan.some((item) => item.decision === "manufacture"),
    fulfillmentPlan,
  };
}
