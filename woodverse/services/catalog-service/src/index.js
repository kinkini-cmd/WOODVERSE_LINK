import express from "express";
import dotenv from "dotenv";
import { catalogVendorProduct, CatalogVendorProductError } from "../../shared/catalog-vendor-product/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "catalog-service" });
});

app.get("/catalog", (req, res) => {
  res.json({ products: catalogVendorProduct.listAvailableProducts() });
});

app.get("/vendors", (req, res) => {
  res.json({ vendors: catalogVendorProduct.listVendors() });
});

app.post("/products", (req, res) => {
  try {
    res.status(201).json({ product: catalogVendorProduct.createProduct(req.body) });
  } catch (error) {
    handleDomainError(error, res);
  }
});

app.post("/products/:productId/publish", (req, res) => {
  try {
    res.json({ product: catalogVendorProduct.publishProduct({ productId: req.params.productId, vendorId: req.body.vendorId }) });
  } catch (error) {
    handleDomainError(error, res);
  }
});

app.patch("/products/:productId/stock", (req, res) => {
  try {
    res.json({ product: catalogVendorProduct.adjustStock({ productId: req.params.productId, vendorId: req.body.vendorId, quantity: req.body.quantity }) });
  } catch (error) {
    handleDomainError(error, res);
  }
});

function handleDomainError(error, res) {
  if (error instanceof CatalogVendorProductError) {
    res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    return;
  }
  res.status(500).json({ ok: false, error: "Internal server error" });
}

app.listen(port, () => {
  console.log(`Catalog service running on http://localhost:${port}`);
});
