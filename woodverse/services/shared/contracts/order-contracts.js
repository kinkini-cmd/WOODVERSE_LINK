export const OrderCreatedEvent = {
  type: "OrderCreated",
  payload: {
    orderId: "string",
    customerId: "string",
    total: "number",
    status: "string"
  }
};

export const OrderNeedsApprovalEvent = {
  type: "OrderNeedsApproval",
  payload: {
    orderId: "string",
    vendorId: "string",
    reason: "string"
  }
};
