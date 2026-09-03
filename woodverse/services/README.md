# WoodVerse Services Layout

This folder contains the service-oriented structure for the recommended microservice split.

## Design constraints

- The frontend does not touch databases directly.
- Each backend service exposes HTTP APIs.
- Each service owns its own database schema and data access layer.
- The API gateway/front-end talks to services via HTTP only.
- Shared contracts and event schemas live in the shared folder.

## Structure

```text
woodverse/
  frontend/
    src/

  services/
    shared/
      contracts/
      events/
      schemas/
      libs/
    api-gateway/
      src/
      package.json
    auth-service/
      src/
      package.json
    catalog-service/
      src/
      package.json
    vendor-service/
      src/
      package.json
    order-service/
      src/
      package.json
    inventory-service/
      src/
      package.json
    production-service/
      src/
      package.json
    payment-service/
      src/
      package.json
    notifications-service/
      src/
      package.json
    ai-service/
      src/
      package.json
```

## Communication flow

1. Frontend calls the API Gateway.
2. API Gateway routes to a service API.
3. Service validates business rules and talks to its own database.
4. Service emits domain events for other services through a broker.
5. Other services update their own data stores asynchronously.

This preserves the separation of concerns and keeps the database out of direct frontend access.
