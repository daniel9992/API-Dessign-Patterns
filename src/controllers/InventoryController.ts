// src/controllers/InventoryController.ts

import { NextFunction, Request, Response } from "express";
import dbService from "../services/DBService"; // Direct DB access for simple read
import { HttpError } from "../utils/HttpError";

// GET /v1/stores/:storeId/inventory
export const getInventoryLevels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;

  try {
    // Simple read operation using a complex JOIN for comprehensive inventory data
    const inventoryList = await dbService.query(
      `SELECT 
                T1.productId, T2.sku, T2.name, T1.currentStock, T2.baseUnits, T1.lastUpdated
            FROM Inventory T1
            JOIN Products T2 ON T1.productId = T2.productId
            WHERE T1.storeId = ?`,
      [storeId]
    );

    // Response uses the collection format for the list of items in the inventory resource
    res.status(200).json(inventoryList);
  } catch (error) {
    next(error);
  }
};

// PATCH /v1/stores/:storeId/inventory
// Used for manual stock correction or receiving a purchase
export const updateInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;
  const { productId, quantityChange, performedByUserId, notes } = req.body;

  if (!productId || typeof quantityChange !== "number") {
    return next(
      new HttpError(
        "Missing product ID or quantityChange in request body.",
        400
      )
    );
  }

  try {
    // 1. Business Logic: Delegate the transactional stock update to the service
    const result = await InventoryService.applyStockChange(
      storeId,
      productId,
      quantityChange,
      performedByUserId,
      notes
    );

    // 2. Standardized Response: Return the updated product inventory details
    res.status(200).json({
      productId,
      newStock: result.newStock,
      message: "Inventory updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// --- Inventory Service Logic (Conceptual) ---
// This is where the complex transaction logic would live.
export class InventoryService {
  // This method handles both sales reductions and purchase increases
  public static async applyStockChange(
    storeId: string,
    productId: string,
    quantityChange: number,
    performedByUserId: string,
    notes: string
  ): Promise<{ newStock: number }> {
    // NOTE: In a real system, this must be wrapped in a database transaction
    // to prevent race conditions during concurrent updates.

    // 1. Check if the product exists in the store's inventory. If not, create it.
    // 2. Calculate new stock: currentStock + quantityChange.
    // 3. Prevent negative stock if change is a reduction.
    // 4. Update the Inventory table.
    // 5. Log the StockAdjustment transaction (if implemented).

    // Mock result for demonstration:
    const mockNewStock = 100 + quantityChange;
    return { newStock: mockNewStock };
  }
}
