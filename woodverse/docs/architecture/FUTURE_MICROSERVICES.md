# Future Microservices Architecture

## Overview

WoodVerse is a marketplace and manufacturing-aware commerce platform. The current repo already shows the correct domain seams: customer shopping, vendor management, product catalog, stock evaluation, order approval, production tracking, AI support, and messaging. A microservice redesign should follow those seams instead of splitting by framework.

This design keeps the front end as a single experience layer while splitting the core business into domain-owned services.

## Guiding principles

- Split by business ownership, not by technology.
- Each service owns a single transactional domain and its database.
- Keep order lifecycle as the central workflow.
- Treat AI as an adapter service with a narrow contract.
- Use events for cross-service updates, not direct shared tables.
- Keep the user experience stable by placing a gateway in front of the services.

## Core service map

### 1. API Gateway / BFF

Purpose:
- route frontend requests to domain services
- perform auth/session validation
- enforce per-role authorization rules
- normalize cross-service responses for the client

Owns:
- routing
- request shaping
- identity propagation
- rate limiting and public surface

### 2. Auth and Identity Service

Purpose:
- user accounts
- role management
- vendor and supplier verification state
- session and token issuance

Owns:
- users
- roles
- credentials and profile metadata

### 3. Catalog and Product Service

Purpose:
- product listings
- item metadata
- pricing metadata
- image references
- published product state

Owns:
- products
- categories
- tags and material metadata
- vendor-to-product linkages

### 4. Vendor and Supplier Management Service

Purpose:
- registration
- verification workflow
- document collection
- supplier relationships

Owns:
- vendors
- suppliers
- verification records
- vendor documents

### 5. Order and Fulfillment Service

Purpose:
- cart-to-order conversion
- order status transitions
- vendor approval flow
- shipment handoff coordination

Owns:
- orders
- quotations
- payment checkpoints
- shipping references
- fulfillment plan(s)

### 6. Inventory and Warehouse Service

Purpose:
- stock counts
- reservation logic
- low-stock and out-of-stock state
- warehouse metadata

Owns:
- stock records
- inventory movements
- warehouse allocations

### 7. Production and Work Order Service

Purpose:
- work orders
- manufacturing stages
- production progress
- vendor work scheduling

Owns:
- production work orders
- production status history
- manufacturing tasks

### 8. Payment Service

Purpose:
- payment authorization
- capture and settlement
- refund workflow
- payout state for vendors

Owns:
- payment records
- payout ledger
- payment status transitions

### 9. Notification and Messaging Service

Purpose:
- customer-vendor messaging
- admin notifications
- realtime updates
- event fan-out

Owns:
- message threads
- notifications
- delivery status for alerts

### 10. AI Assistant Service

Purpose:
- product search help
- stock/manufacture recommendation
- customer support triage
- quote assistance

Owns:
- model configuration
- inference endpoints
- intent policy and fallback handling

Important: AI does not own transactional order state. It only consumes order and catalog context and emits recommendations or events.

## Domain event model

The system should use asynchronous events for coordination. Examples:

- ProductPublished
- ProductUpdated
- VendorApproved
- InventoryReserved
- InventoryShortageDetected
- OrderCreated
- OrderNeedsApproval
- QuoteSubmitted
- ProductionStarted
- ProductionCompleted
- ShipmentCreated
- PaymentCaptured
- NotificationSent

These events should flow through a message broker such as RabbitMQ or Kafka. The broker becomes the integration layer, while the service APIs remain the transactional boundary.

## Recommended ownership boundaries

### Order service should own the lifecycle
The current repo already makes the Order flow the operational center. The order should decide whether a product is:
- in stock
- low stock
- manufacture required
- waiting for vendor approval
- ready for shipping

This should not be duplicated in catalog, payment, or AI service logic.

### Inventory service should own stock truth
Stock counts should exist in one place, and all other services should read the current status from that service or via event-driven snapshots.

### Catalog service should own catalog truth
Catalog product metadata should not be redefined separately in every service. Product descriptors, categories, and material metadata belong here.

### Vendor service should own vendor authority
Vendor verification, business profile, and document state should remain domain-owned by the vendor service, not recreated in order and product logic.

## Communication model

### Synchronous

Use synchronous requests for:
- live read operations
- verification checks
- identity claims
- immediacy-sensitive user flows

Examples:
- gateway asks auth service for user role
- order service asks inventory service for stock availability
- order service asks vendor service for vendor validity

### Asynchronous

Use event-driven messaging for:
- notification propagation
- downstream state updates
- order lifecycle changes
- stock shortage alerts
- production completion notices

This reduces blocking and keeps services loosely coupled.

## Database model

Each service owns its own PostgreSQL schema. Do not share the current monolith schema across services.

Suggested ownership:

- auth-service: users, roles, sessions
- catalog-service: products, categories, tags
- vendor-service: vendors, suppliers, verification records
- order-service: orders, quotations, fulfillment plans, shipment refs
- inventory-service: stock items, reservations, warehouses
- production-service: work orders, manufacturing tasks
- payment-service: payments, refunds, payouts
- notification-service: messages, notifications
- ai-service: models, prompt config, inference logs

## Initial rollout plan

### Phase 1: split the real core

- API gateway
- auth-service
- catalog-service
- vendor-service
- order-service

This captures the core business path and matches the repo’s strongest existing seams.

### Phase 2: operational services

- inventory-service
- production-service
- notifications-service

### Phase 3: financial and AI expansion

- payment-service
- AI service as isolated adapter
- advanced demand forecasting and measurement features

## Suggested folder layout

```text
woodverse/
  services/
    api-gateway/
    auth-service/
    catalog-service/
    vendor-service/
    order-service/
    inventory-service/
    production-service/
    payment-service/
    notifications-service/
    ai-service/
    shared/
      contracts/
      events/
      schemas/
      libs/
```

## Service contracts

Each service should expose a stable contract for its domain and keep heavy business logic behind that contract. The gateway should not coordinate the entire order process on its own. Instead, each service should do the domain work for its own state and emit events for downstream services.

## Example route responsibilities

- Auth service
  - POST /login
  - GET /me
  - POST /roles

- Catalog service
  - GET /products
  - GET /products/:id
  - POST /products

- Vendor service
  - POST /vendors
  - GET /vendors/:id
  - POST /vendors/:id/verify

- Order service
  - POST /orders
  - GET /orders/:id
  - POST /orders/:id/approve
  - POST /orders/:id/ship

- Inventory service
  - GET /inventory/:productId
  - POST /inventory/reserve
  - POST /inventory/release

- Production service
  - POST /work-orders
  - GET /work-orders/:id
  - PATCH /work-orders/:id/status

- Notification service
  - POST /messages
  - GET /threads/:id
  - POST /notifications

- AI service
  - POST /ai/chat
  - POST /ai/stock-decision

## Why this redesign fits WoodVerse

This architecture matches the actual domain model already visible in the repo:

- [woodverse/backend/api/src/routes/orders.js](../backend/api/src/routes/orders.js) shows the order lifecycle and approval logic are the operational heart of the platform.
- [woodverse/database/schema.sql](../../database/schema.sql) separates users, vendors, products, orders, quotations, messages, and customizations.
- [woodverse/backend/ai-service/src/main.py](../../backend/ai-service/src/main.py) is already a clear domain boundary for AI and can evolve into a dedicated service.

This is the cleanest microservice move because it preserves the business model without forcing a full distributed architecture too early.

## Final recommendation

Do not move to full microservices immediately. Start with a modular monolith that is intentionally structured for a near-term service split, then separate these domains in this order:

1. auth
2. catalog
3. vendor
4. order
5. inventory
6. production
7. notifications
8. payment
9. AI

That sequence matches both the repo’s current architecture and the operating complexity of the business.
