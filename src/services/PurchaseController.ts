// src/controllers/PurchaseController.ts

import { NextFunction, Request, Response } from "express";
import { Purchase } from "../models/Transaction";
import { InventoryService } from "../services/InventoryService";
import { HttpError } from "../utils/HttpError";

// POST /v1/stores/:storeId/purchases
// Creates a new Purchase resource. This is the entry point for inventory increase.
export const createPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;
  const purchaseData = req.body; // Includes employeeUserId, supplierName, purchaseItems, isReceived(optional)

  if (
    !purchaseData.employeeUserId ||
    !purchaseData.purchaseItems ||
    purchaseData.purchaseItems.length === 0
  ) {
    return next(new HttpError("Missing employee ID or purchase items.", 400));
  }

  try {
    // 1. Process the Purchase Resource (The service handles insertion and conditional inventory update)
    const newPurchase: Purchase = await InventoryService.processPurchase(
      storeId,
      purchaseData
    );

    // 2. Standard 201 Created Response, returning the new Purchase resource
    res.status(201).json(newPurchase);
  } catch (error) {
    next(error);
  }
};

// PATCH /v1/stores/:storeId/purchases/:purchaseId/receive
// A custom action (RPC-like) to flag an existing purchase as received, triggering inventory increase.
export const markPurchaseReceived = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId, purchaseId } = req.params;
  const { employeeUserId } = req.body; // Who signed for the goods

  if (!employeeUserId) {
    return next(
      new HttpError(
        "Employee ID is required for marking purchase as received.",
        400
      )
    );
  }

  try {
    // 1. Update the Purchase resource and fetch all its items.
    // This addresses the "markPurchaseReceived" existence error.
    const updatedPurchase = await InventoryService.markPurchaseReceived(
      storeId,
      purchaseId,
      employeeUserId
    );

    // 2. Inventory Increase (Core Logic)
    // Use the line items fetched during the resource update step.
    await InventoryService.increaseStockForPurchase(
      storeId,
      updatedPurchase.purchaseItems,
      employeeUserId
    );

    // 3. Predictable Success Response
    res.status(200).json({
      message: `Purchase ${purchaseId} marked as received, inventory updated.`,
      purchase: updatedPurchase,
    });
  } catch (error) {
    next(error);
  }
};

// --- Add this controller to your router setup: ---

// src/routes/storeRoutes.ts addition:
/*
import * as PurchCtrl from '../controllers/PurchaseController';

// --- Purchases (Nested Transactional Resource) ---
router.route('/stores/:storeId/purchases')
    .post(PurchCtrl.createPurchase);
    
router.route('/stores/:storeId/purchases/:purchaseId/receive')
    .patch(PurchCtrl.markPurchaseReceived);
*/
