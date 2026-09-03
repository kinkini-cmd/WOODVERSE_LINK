import {
  buildFulfillmentPlan,
  callAiService,
  fallbackChatResponse,
} from "../../utils/helpers.js";
import { catalogProducts } from "../../data/memory.js";

export function createAiAdapter({ primaryProvider, fallbackProvider }) {
  if (!primaryProvider || !fallbackProvider) {
    throw new Error("AI adapter requires primary and fallback providers");
  }

  return {
    async chat(request) {
      return executeWithFallback(
        () => primaryProvider.chat(request),
        () => fallbackProvider.chat(request),
      );
    },

    async stockDecision(request) {
      return executeWithFallback(
        () => primaryProvider.stockDecision(request),
        () => fallbackProvider.stockDecision(request),
      );
    },
  };
}

async function executeWithFallback(primaryOperation, fallbackOperation) {
  try {
    return await primaryOperation();
  } catch {
    return fallbackOperation();
  }
}

function createHttpProvider({ serviceUrl }) {
  return {
    chat(request) {
      return callAiService(serviceUrl, "/ai/chat", request).then((result) => ({
        ...result,
        source: result.source || "fastapi",
      }));
    },

    stockDecision(request) {
      return callAiService(serviceUrl, "/ai/stock-decision", request).then((result) => ({
        ...result,
        source: result.source || "fastapi",
      }));
    },
  };
}

function createFallbackProvider() {
  return {
    chat(request) {
      return fallbackChatResponse(request.message);
    },

    stockDecision(request) {
      const fulfillmentPlan = buildFulfillmentPlan(request.items || [], catalogProducts);
      return {
        requiresVendorApproval: fulfillmentPlan.some((item) => item.vendorApprovalRequired),
        productionTrackingRequired: fulfillmentPlan.some((item) => item.decision === "manufacture"),
        fulfillmentPlan,
        source: "api-fallback",
      };
    },
  };
}

export const aiAdapter = createAiAdapter({
  primaryProvider: createHttpProvider({
    serviceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  }),
  fallbackProvider: createFallbackProvider(),
});