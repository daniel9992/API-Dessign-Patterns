// src/controllers/SalesController.ts

import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid"; // Helper for unique IDs
import { Sale, SaleLineItem } from "../models/Transaction"; // Assuming Transaction models file
import dbService from "../services/DBService";
import { InventoryService } from "../services/InventoryService";
import { HttpError } from "../utils/HttpError";

// POST /v1/stores/:storeId/sales
export const createSale = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;
  const { employeeUserId, totalAmountCents, lineItems } = req.body;
  const saleId = uuidv4();
  const saleDate = new Date().toISOString();

  // Validate core data presence
  if (!employeeUserId || !lineItems || lineItems.length === 0) {
    return next(new HttpError("Missing employee ID or sale line items.", 400));
  }

  try {
    // NOTE: The entire sale processing should be a single database transaction:
    // 1. Check stock. 2. Record sale. 3. Reduce inventory.

    // 1. Check Stock Availability (Critical Pre-validation)
    await InventoryService.checkStock(storeId, lineItems);

    // 2. Record the Sale Resource
    await dbService.run(
      `INSERT INTO Sales (saleId, storeId, employeeUserId, saleDate, totalAmountCents)
             VALUES (?, ?, ?, ?, ?)`,
      [saleId, storeId, employeeUserId, saleDate, totalAmountCents]
    );

    // 3. Record Sale Line Items (Association Data)
    // Batch insertion of line items for the Sale resource
    await InventoryService.recordSaleLineItems(saleId, lineItems);

    // 4. Inventory Reduction (Core Business Logic)
    await InventoryService.reduceStockForSale(
      storeId,
      lineItems,
      employeeUserId
    );

    // 5. Standard 201 Created Response, returning the new Sale resource
    const newSale: Sale = {
      saleId,
      storeId,
      employeeUserId,
      totalAmountCents,
      saleDate: new Date(saleDate),
      lineItems,
    };
    res.status(201).json(newSale);
  } catch (error) {
    // If an error occurs (e.g., checkStock fails or DB error), the transaction should rollback
    next(error);
  }
};
