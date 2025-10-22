import express from "express";
import { storeExistsMiddleware } from "middleware/storeAuth";
// import * as InvCtrl from "../controllers/InventoryController";
// import * as SaleCtrl from "../controllers/SalesController";
// import * as RepCtrl from "../controllers/ReportController";
// import { storeExistsMiddleware } from "../middleware/storeAuth";

const router = express.Router();

// Middleware to ensure a valid storeId is used for all nested paths (Cap 1: Operational)
router.use("/stores/:storeId", storeExistsMiddleware);

// --- Sales (Nested Resource) ---
// POST /stores/:storeId/sales (Create a Sale, triggers Inventory reduction)
router.post("/stores/:storeId/sales", SaleCtrl.createSale);

// --- Inventory (Singleton Sub-resource) ---
// GET /stores/:storeId/inventory (Get current stock levels)
router.get("/stores/:storeId/inventory", InvCtrl.getInventoryLevels);
// PATCH /stores/:storeId/inventory (For manual stock adjustments/checks)
router.patch("/stores/:storeId/inventory", InvCtrl.updateInventory);

// --- Reporting / Statistics (Custom RPC-like Method for Read-Only Data) ---
// GET /stores/:storeId/stats/weekly (Get sales statistics compiled by employee)
router.get("/stores/:storeId/stats/weekly", RepCtrl.getWeeklyEmployeeStats);

// --- Shopping List (Computed Singleton Sub-resource) ---
// GET /stores/:storeId/shoppingLists/lowStock (List products below 75% of baseUnits)
router.get(
  "/stores/:storeId/shoppingLists/lowStock",
  RepCtrl.getLowStockShoppingList
);

export default router;
