export class CatalogVendorProductError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function requireVendor(vendors, vendorId) {
  const vendor = vendors.get(vendorId);
  if (!vendor) {
    throw new CatalogVendorProductError("VENDOR_NOT_FOUND", "Vendor does not exist", 404);
  }
  if (vendor.status !== "approved") {
    throw new CatalogVendorProductError("VENDOR_NOT_APPROVED", "Vendor is not approved", 409);
  }
  return vendor;
}

function requireOwnedProduct(products, productId, vendorId) {
  const product = products.get(productId);
  if (!product) {
    throw new CatalogVendorProductError("PRODUCT_NOT_FOUND", "Product does not exist", 404);
  }
  if (product.vendorId !== vendorId) {
    throw new CatalogVendorProductError("PRODUCT_NOT_OWNED", "Vendor does not own this product", 403);
  }
  return product;
}

export function createCatalogVendorProductModule(repository) {
  const { vendors, products } = repository;

  return {
    listAvailableProducts() {
      return [...products.values()].filter(
        (product) => product.status === "published" && product.stockQuantity > 0
      );
    },

    listVendors() {
      return [...vendors.values()];
    },

    createProduct(input) {
      requireVendor(vendors, input.vendorId);
      if (input.stockQuantity < 0) {
        throw new CatalogVendorProductError("INVALID_STOCK", "Stock cannot be negative");
      }

      const product = {
        id: input.id || `product-${products.size + 1}`,
        vendorId: input.vendorId,
        name: input.name,
        price: input.price,
        stockQuantity: input.stockQuantity || 0,
        status: input.status || "draft"
      };
      products.set(product.id, product);
      return product;
    },

    publishProduct({ productId, vendorId }) {
      requireVendor(vendors, vendorId);
      const product = requireOwnedProduct(products, productId, vendorId);
      if (product.stockQuantity <= 0) {
        throw new CatalogVendorProductError(
          "PRODUCT_UNAVAILABLE",
          "A product must have stock before it can be published",
          409
        );
      }
      product.status = "published";
      return product;
    },

    adjustStock({ productId, vendorId, quantity }) {
      requireVendor(vendors, vendorId);
      const product = requireOwnedProduct(products, productId, vendorId);
      const nextQuantity = product.stockQuantity + quantity;
      if (nextQuantity < 0) {
        throw new CatalogVendorProductError("INSUFFICIENT_STOCK", "Stock cannot become negative", 409);
      }
      product.stockQuantity = nextQuantity;
      if (product.stockQuantity === 0) {
        product.status = "archived";
      }
      return product;
    }
  };
}

export const catalogVendorProduct = createCatalogVendorProductModule({
  vendors: new Map([
    ["v-1", { id: "v-1", businessName: "Moratuwa Crafts", status: "approved" }],
    ["v-2", { id: "v-2", businessName: "Ceylon Woods", status: "approved" }]
  ]),
  products: new Map([
    ["p-1", { id: "p-1", vendorId: "v-1", name: "Royal Majesty Set", price: 1200, stockQuantity: 24, status: "published" }],
    ["p-2", { id: "p-2", vendorId: "v-2", name: "Linear Teak Desk", price: 900, stockQuantity: 12, status: "published" }]
  ])
});