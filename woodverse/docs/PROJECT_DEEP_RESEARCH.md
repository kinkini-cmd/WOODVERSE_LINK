# WoodVerse Deep Project Research

## Executive summary

WoodVerse is best understood as a modular-monolith marketplace and operations platform for furniture, wooden gifts, custom wood products, and supplier coordination. The repo shows a planned architecture, real frontend routes, a PostgreSQL-ready schema, and a FastAPI AI service, but the product docs are still mostly architecture and feature placeholders rather than completed implementation specs.

The strongest evidence is that the project combines three layers:

- a React/Vite storefront and role-based portal frontend in [woodverse/frontend/src/App.jsx](../frontend/src/App.jsx)
- an Express API with routes for catalog, users, vendors, products, orders, quotations, messages, AI, and notifications in [woodverse/backend/api/src/routes/index.js](../backend/api/src/routes/index.js)
- a PostgreSQL schema with users, vendors, products, orders, quotations, messages, customizations, and fulfillment entities in [woodverse/database/schema.sql](../database/schema.sql)

This means the project is not just a landing page or mock demo; it is designed as a functional commerce and manufacturing-tracking system with clear roles and a defined data model.

## 1. Business model and product intent

The project description repeatedly frames WoodVerse as an AI-assisted multi-vendor web platform for furniture and wood products. The clearest statement appears in [woodverse/README.md](../README.md), [woodverse/docs/architecture/SYSTEM_ARCHITECTURE.md](./architecture/SYSTEM_ARCHITECTURE.md), and [woodverse/docs/FULL_SYSTEM_DOCUMENTATION.md](./FULL_SYSTEM_DOCUMENTATION.md).

The business model appears to be a hybrid of:

- B2C ecommerce for furniture and gift products
- B2B vendor management for sellers and manufacturers
- supplier coordination and material sourcing
- order and production orchestration
- AI-enabled assistance for quoting, stock decisions, and customer support

The project is not a simple retail storefront. It is an operational platform with commercial and supply-chain logic.

## 2. System architecture

The docs explicitly call for a modular monolith, with AI, commerce, and operations eventually separated if needed. This is stated in [woodverse/docs/architecture/SYSTEM_ARCHITECTURE.md](./architecture/SYSTEM_ARCHITECTURE.md) and [woodverse/docs/architecture/MODULAR_MONOLITH.md](./architecture/MODULAR_MONOLITH.md).

The current implementation structure matches that direction:

- frontend: React + Vite + Tailwind
- backend: Express API + Socket.IO
- AI layer: FastAPI + scikit-learn + MLP classifier
- database: PostgreSQL
- repo layout: monorepo with frontend and backend workspaces in [woodverse/package.json](../package.json)

This is a logical internal architecture, but it is also a risk: the product scope is very large for a first build. The modular-monolith strategy makes sense for a startup or prototype, but the repo still tries to cover too many domains at once.

## 3. User roles and core workflows

The repo names five main roles:

- Customer
- Vendor / Seller
- Supplier
- Support Staff
- System Administrator

Those roles are reflected in the frontend route map in [woodverse/frontend/src/App.jsx](../frontend/src/App.jsx), which includes vendor dashboards, supplier profile pages, and admin dashboards.

The most important functional flows are visible in the data model and API structure:

- customer product browsing and order placement
- vendor approval for stock or manufacturing
- stock decision and fulfillment planning
- quotation generation and acceptance
- production tracking after vendor approval
- realtime messaging between actors
- AI chat assistance for product and support queries

## 4. The actual data model is more concrete than the docs

The database schema in [woodverse/database/schema.sql](../database/schema.sql) is the strongest signal of actual intent.

It defines entities such as:

- users
- vendors
- products
- orders
- quotations
- messages
- fabric_options
- paint_options
- product_customizations
- customization_requests

This is a meaningful commerce domain model. It includes workflow states like vendor approval, manufacturing, ready-for-delivery, shipped, completed, and cancelled. Those state values are more than generic placeholders and reflect a real order lifecycle.

The schema also signals that product customization and supplier/vendor coordination are expected features, not optional extras.

## 5. API contract shows the project is already designed around a real marketplace flow

The API registration file in [woodverse/backend/api/src/routes/index.js](../backend/api/src/routes/index.js) shows the intended endpoints:

- /api/health
- /api/db/health
- /api/auth/login
- /api/catalog
- /api/users
- /api/vendors
- /api/products
- /api/orders
- /api/quotations
- /api/messages

The order route in [woodverse/backend/api/src/routes/orders.js](../backend/api/src/routes/orders.js) is especially revealing. It performs stock evaluation and marks order requirements as either:

- requires vendor approval
- production tracking required
- stock fulfillment possible

This aligns directly with the AI decision logic and the database schema. The project is modeling a real manufacturing-aware commerce workflow rather than a simple cart checkout.

## 6. AI is a core product differentiator, not a side feature

The AI service in [woodverse/backend/ai-service/src/main.py](../backend/ai-service/src/main.py) is not an afterthought. It contains a trained classifier for intents such as:

- order_tracking
- delivery
- product_search
- payment
- stock_manufacture
- production
- realtime_chat
- returns
- account
- vendor_supplier

It also includes a stock decision model and custom recommendation logic for materials, paints, and product configuration. That means the project is trying to support:

- customer help chat
- stock vs. manufacturing decisioning
- quote support
- design assistance
- vendor approval assistance

The AI is tightly coupled to operational flows. That is a strong strategic decision, but it increases delivery risk unless the core commerce and vendor workflow are already stable.

## 7. Frontend is more complete than the backend docs

The frontend route map in [woodverse/frontend/src/App.jsx](../frontend/src/App.jsx) includes a wide set of pages for:

- home and catalog browsing
- cart and payment flows
- delivery and chatbot pages
- vendor dashboards and operations
- supplier profile
- admin dashboard

There is also a real catalog dataset and a basic product card flow in [woodverse/frontend/src/data/catalog.js](../frontend/src/data/catalog.js), which gives the app a concrete storefront look and feel.

The frontend therefore presents a plausible product experience, while the backend and docs are still planning-phase material. That suggests the team is building a prototype or product vision demo, not a fully stabilized production system.

## 8. Strengths of the repo

The project has several real advantages:

- strong domain scope and clear product vision
- realistic multi-role workflow architecture
- actual PostgreSQL schema rather than only mock state
- AI integration built into business flows
- role-specific UI structure already sketched out
- monorepo deployment and service boundaries already planned

## 9. Main risks and gaps

The deeper research also reveals major risks:

### a. Scope breadth exceeds delivery realism
The product tries to cover product catalog, customization, inventory, production tracking, payments, delivery, support, and AI in one repo. This is a very broad feature surface for a first release.

### b. Docs are not implementation detail
The feature documents such as [woodverse/docs/features/ORDER_MANAGEMENT.md](./features/ORDER_MANAGEMENT.md), [woodverse/docs/features/VENDOR_MANAGEMENT.md](./features/VENDOR_MANAGEMENT.md), and [woodverse/docs/features/PRODUCTION_TRACKING.md](./features/PRODUCTION_TRACKING.md) are mostly templates rather than complete engineering specs. They describe requirements but do not define concrete logic or acceptance criteria.

### c. AI and operational flows are interdependent
AI stock and production guidance are tightly connected to manual vendor approval and order status transitions. Without a clear workflow engine, the AI could become a thin wrapper with little operational value.

### d. Business model uncertainty remains
The project reads like a combined marketplace and B2B operations platform. That may be too ambitious unless the initial target is narrowed to a clear first customer segment.

## 10. Most likely project direction

The repository suggests the intended product direction is:

1. A Sri Lanka-focused furniture marketplace with customized ordering
2. Multi-role digital operations for vendors, suppliers, and admins
3. Production-aware fulfillment where stock shortages trigger vendor approval and manufacturing workflows
4. AI support for product discovery, quote help, order tracking, and support operations

This is a credible product strategy, but not a low-risk first product. It needs a narrowed MVP for validation.

## 11. Recommendation for the next phase

If this project is to be successfully delivered, the clearest next move is to reduce to a focused MVP:

- Customer storefront and catalog
- Vendor onboarding and product publishing
- Order lifecycle with stock evaluation
- Basic quotation workflow
- Production status tracking only for manufacturing-required items
- AI assistant limited to product search, stock help, and support triage

Everything else should be saved for phase 2.

## Sources reviewed

- [woodverse/README.md](../README.md)
- [woodverse/package.json](../package.json)
- [woodverse/frontend/src/App.jsx](../frontend/src/App.jsx)
- [woodverse/frontend/src/data/catalog.js](../frontend/src/data/catalog.js)
- [woodverse/backend/api/src/routes/index.js](../backend/api/src/routes/index.js)
- [woodverse/backend/api/src/routes/orders.js](../backend/api/src/routes/orders.js)
- [woodverse/backend/api/src/routes/catalog.js](../backend/api/src/routes/catalog.js)
- [woodverse/backend/api/src/routes/ai.js](../backend/api/src/routes/ai.js)
- [woodverse/backend/ai-service/src/main.py](../backend/ai-service/src/main.py)
- [woodverse/database/schema.sql](../database/schema.sql)
- [woodverse/docs/architecture/SYSTEM_ARCHITECTURE.md](./architecture/SYSTEM_ARCHITECTURE.md)
- [woodverse/docs/architecture/MODULAR_MONOLITH.md](./architecture/MODULAR_MONOLITH.md)
- [woodverse/docs/FULL_SYSTEM_DOCUMENTATION.md](./FULL_SYSTEM_DOCUMENTATION.md)
- [woodverse/docs/features/ORDER_MANAGEMENT.md](./features/ORDER_MANAGEMENT.md)
- [woodverse/docs/features/VENDOR_MANAGEMENT.md](./features/VENDOR_MANAGEMENT.md)
- [woodverse/docs/features/PRODUCTION_TRACKING.md](./features/PRODUCTION_TRACKING.md)
- [woodverse/docs/features/AI_QUOTATION.md](./features/AI_QUOTATION.md)
