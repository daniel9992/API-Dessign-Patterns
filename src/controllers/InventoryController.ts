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
import { InventoryService } from "../services/InventoryService";

export const createInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;
  const { productId, quantity } = req.body;

  if (!productId || typeof quantity !== "number") {
    return next(
      new HttpError("Missing product ID or quantity in request body.", 400)
    );
  }

  try {
    const newItem = await InventoryService.createInventoryItem(
      storeId,
      productId,
      quantity
    );
    res.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
};

export const getInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId, productId } = req.params;

  try {
    const item = await InventoryService.getInventoryItem(storeId, productId);
    if (!item) {
      return next(new HttpError("Inventory item not found.", 404));
    }
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId, productId } = req.params;
  const { quantity } = req.body;

  if (typeof quantity !== "number") {
    return next(new HttpError("Missing quantity in request body.", 400));
  }

  try {
    const updatedItem = await InventoryService.updateInventoryItem(
      storeId,
      productId,
      quantity
    );
    res.status(200).json(updatedItem);
  } catch (error) {
    next(error);
  }
};

export const deleteInventoryItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId, productId } = req.params;

  try {
    await InventoryService.deleteInventoryItem(storeId, productId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
