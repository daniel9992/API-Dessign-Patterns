import express from "express";
import * as InvCtrl from "../controllers/InventoryController";
import * as RepCtrl from "../controllers/ReportController";
import * as SaleCtrl from "../controllers/SalesController";
import { storeExistsMiddleware } from "../middleware/storeAuth";

const router = express.Router();

// --- Main Router ---
const storeRouter = express.Router();

// All child routes in this router are nested under `/stores/:storeId`
// and will have the `storeExistsMiddleware` applied.
router.use("/stores/:storeId", storeExistsMiddleware, storeRouter);

// --- Sales (Nested Resource) ---
// POST /sales (Create a Sale, triggers Inventory reduction)
storeRouter.post("/sales", SaleCtrl.createSale);
// GET /sales (Get all sales for a store)
storeRouter.get("/sales", SaleCtrl.getAllSales);
// GET /sales/:saleId (Get a single sale)
storeRouter.get("/sales/:saleId", SaleCtrl.getSaleById);
// DELETE /sales/:saleId (Delete a sale and restock inventory)
storeRouter.delete("/sales/:saleId", SaleCtrl.deleteSale);

// --- Inventory (Singleton Sub-resource) ---
// GET /inventory (Get current stock levels)
storeRouter.get("/inventory", InvCtrl.getInventoryLevels);
// POST /inventory (Create a new inventory item)
storeRouter.post("/inventory", InvCtrl.createInventoryItem);
// GET /inventory/:productId (Get a single inventory item)
storeRouter.get("/inventory/:productId", InvCtrl.getInventoryItem);
// PATCH /inventory/:productId (Update a single inventory item)
storeRouter.patch("/inventory/:productId", InvCtrl.updateInventoryItem);
// DELETE /inventory/:productId (Delete a single inventory item)
storeRouter.delete("/inventory/:productId", InvCtrl.deleteInventoryItem);
// PATCH /inventory (For manual stock adjustments/checks)
storeRouter.patch("/inventory", InvCtrl.updateInventory);

// --- Reporting / Statistics (Custom RPC-like Method for Read-Only Data) ---
// GET /stats/weekly (Get sales statistics compiled by employee)
storeRouter.get("/stats/weekly", RepCtrl.getWeeklyEmployeeStats);

// --- Shopping List (Computed Singleton Sub-resource) ---
// GET /shoppingLists/lowStock (List products below 75% of baseUnits)
storeRouter.get(
  "/shoppingLists/lowStock",
  RepCtrl.getLowStockShoppingList
);

// --- Useful Functions ---
// GET /stats/productHistory/:productId (Get sales history for a specific product)
storeRouter.get(
  "/stats/productHistory/:productId",
  RepCtrl.getProductSaleHistory
);

// GET /stats/unreceivedPurchases (List all outstanding purchase orders)
storeRouter.get(
  "/stats/unreceivedPurchases",
  RepCtrl.getUnreceivedPurchases
);

export default router;
