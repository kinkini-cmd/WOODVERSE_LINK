import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "api-gateway" });
});

const serviceUrls = {
  catalog: process.env.CATALOG_SERVICE_URL || "http://localhost:5001",
  vendor: process.env.VENDOR_SERVICE_URL || process.env.CATALOG_SERVICE_URL || "http://localhost:5001",
  order: process.env.ORDER_SERVICE_URL || "http://localhost:5003"
};

async function proxyRequest(service, path, options = {}) {
  try {
    const response = await fetch(`${serviceUrls[service]}${path}`, options);
    const body = await response.text();

    return {
      status: response.status,
      body: body ? JSON.parse(body) : null
    };
  } catch (error) {
    return {
      status: 502,
      body: { ok: false, error: `${service} service unavailable` }
    };
  }
}

app.get("/api/catalog", async (req, res) => {
  const result = await proxyRequest("catalog", "/catalog");
  res.status(result.status).json(result.body);
});

app.get("/api/vendors", async (req, res) => {
  const result = await proxyRequest("catalog", "/vendors");
  res.status(result.status).json(result.body);
});

app.get("/api/orders", async (req, res) => {
  const result = await proxyRequest("order", "/orders");
  res.status(result.status).json(result.body);
});

app.post("/api/orders", async (req, res) => {
  const result = await proxyRequest("order", "/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body)
  });
  res.status(result.status).json(result.body);
});

app.listen(port, () => {
  console.log(`API Gateway running on http://localhost:${port}`);
});
