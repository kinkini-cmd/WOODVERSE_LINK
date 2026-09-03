# WoodVerse

## Document Information

- Project: WoodVerse
- Status: Draft
- Version: 1.0
- Last Updated: To be updated
- Owner: WoodVerse Development Team

## Project Context

WoodVerse is an AI-assisted multi-vendor web platform for furniture,
wooden products, wooden gifts, standard laser-cut files, indoor plants,
custom furniture, supplier management, inventory, production tracking,
payments, shipments, support, and administration.

Main roles:

- Customer
- Vendor / Seller
- Supplier
- Support Staff
- System Administrator

Technology stack:

- React.js
- Tailwind CSS
- Node.js
- Express.js
- PostgreSQL
- Python
- FastAPI
- Scikit-learn
- OpenCV
- MiDaS / DPT
- Socket.IO


## Overview

WoodVerse is a multi-role platform for furniture ecommerce, product
customization, vendor operations, suppliers, production tracking, inventory,
payments, shipments, AI assistance, support, and administration.

## Architecture

WoodVerse is organized as an API-first service-oriented monorepo. The frontend talks to the API gateway and service endpoints; it does not connect directly to PostgreSQL. Database access belongs behind the owning backend service or injected persistence adapter.

The current structure supports a gradual migration from the original modular backend to independently deployable services. Existing `backend/` and `database/` directories remain available while the service layer is expanded.

### Repository Structure

```
woodverse/
├── package.json          # Root monorepo config (npm workspaces)
├── frontend/             # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── services/   # Service-owned UI adapters
│   │   │   │   ├── admin/
│   │   │   │   ├── ai/
│   │   │   │   ├── auth/
│   │   │   │   ├── catalog/
│   │   │   │   ├── inventory/
│   │   │   │   ├── logistics/
│   │   │   │   ├── notifications/
│   │   │   │   ├── order/
│   │   │   │   ├── procurement/
│   │   │   │   ├── settings/
│   │   │   │   ├── supplier-portal/
│   │   │   │   ├── supplier-profile/
│   │   │   │   ├── support/
│   │   │   │   ├── vendor-network/
│   │   │   │   └── vendor/
│   │   │   ├── customer/   # Compatibility barrel and legacy implementation
│   │   │   ├── vendor/     # Compatibility barrel and legacy implementation
│   │   │   ├── admin/      # Compatibility barrel and legacy implementation
│   │   │   └── supplier/   # Compatibility barrel and legacy implementation
│   │   ├── components/     # Shared UI components
│   │   ├── data/           # Frontend mock data
│   │   └── utils.js        # Client-side helpers
│   └── package.json
├── services/             # API-first service skeletons
│   ├── api-gateway/       # Public frontend entry point
│   ├── auth-service/      # Authentication and identity
│   ├── catalog-service/   # Products and availability
│   ├── vendor-service/    # Vendor records and verification
│   ├── order-service/     # Order lifecycle
│   ├── inventory-service/ # Stock state
│   ├── production-service/# Manufacturing work
│   ├── payment-service/   # Payment operations
│   ├── notifications-service/
│   ├── ai-service/        # AI service boundary
│   └── shared/            # Contracts, events, and domain modules
├── backend/               # Existing modular backend during migration
│   ├── api/              # Node.js/Express backend
│   │   ├── src/
│   │   │   ├── routes/    # Modular route handlers
│   │   │   ├── modules/   # Deep business modules and injected adapters
│   │   │   ├── utils/     # Shared server utilities
│   │   │   ├── data/      # In-memory fallback data
│   │   │   ├── socket.js  # Socket.IO handlers
│   │   │   ├── db.js      # PostgreSQL connection
│   │   │   └── server.js  # Entry point
│   │   └── package.json
│   └── ai-service/       # Python FastAPI AI service
│       ├── src/
│       │   └── main.py
│       └── requirements.txt
├── database/             # PostgreSQL schema and migrations
│   ├── schema.sql
│   ├── seed.sql
│   └── README.md
└── docs/                 # Product, architecture, API, security, testing, and deployment docs
```

### Service Boundary Rules

- Frontend pages are UI adapters and call HTTP APIs through the gateway or service client.
- HTTP routes translate transport requests and responses; business decisions live in domain modules.
- Each backend service owns its persistence model and may use PostgreSQL through an internal adapter.
- Services communicate through explicit contracts and events rather than shared table access.
- `services/shared` contains contracts and reusable domain interfaces, not database connections.

Important deep modules currently include:

- `backend/api/src/modules/order-intake`: evaluates stock, manufacturing, vendor approval, persistence, and notifications for order intake.
- `backend/api/src/modules/ai/ai-adapter.js`: exposes stable AI contracts while isolating the primary provider and fallback provider.
- `services/shared/catalog-vendor-product`: enforces vendor approval, product ownership, availability, and stock state.

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Python >= 3.10 (for AI service)

### Install

```bash
cd woodverse
npm run install:all
```

### Development

```bash
# Run all services
npm run dev

# Or run individually
npm run dev:web    # Frontend at http://localhost:5173
npm run dev:api    # Backend at http://localhost:4000
npm run dev:ai     # AI service at http://localhost:8000
```

### Build

```bash
npm run build
```

## Documentation

Start with:

- `docs/FULL_SYSTEM_DOCUMENTATION.md`
- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/phases/IMPLEMENTATION_ROADMAP.md`
