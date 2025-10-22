// src/controllers/SalesController.ts

import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid"; // Helper for unique IDs
import { Sale, SaleLineItem } from "../models/Transaction"; // Assuming Transaction models file
import dbService from "../services/DBService";
import { HttpError } from "../utils/HttpError";
// IMPORTANT: Import the actual InventoryService from its module
import { InventoryService } from "../services/InventoryService";

/**
 * POST /v1/stores/:storeId/sales
 * Creates a new Sale Resource, triggering transactional inventory reduction.
 * Adheres to the Resource-Oriented design by using POST on the /sales collection.
 */
export const createSale = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;
  // Ensure lineItems are correctly typed
  const {
    employeeUserId,
    totalAmountCents,
    lineItems,
  }: {
    employeeUserId: string;
    totalAmountCents: number;
    lineItems: SaleLineItem[];
  } = req.body;

  const saleId = uuidv4();
  const saleDate = new Date().toISOString();

  // Validate core data presence (Cap 1: Operational, returning 400)
  if (!employeeUserId || !lineItems || lineItems.length === 0) {
    return next(new HttpError("Missing employee ID or sale line items.", 400));
  }

  try {
    // 1. Check Stock Availability (Critical Pre-validation)
    // The service throws a 409 Conflict error if stock is insufficient.
    await InventoryService.checkStock(storeId, lineItems);

    // 2. Record the Sale Resource (Master record)
    await dbService.run(
      `INSERT INTO Sales (saleId, storeId, employeeUserId, saleDate, totalAmountCents)
       VALUES (?, ?, ?, ?, ?)`,
      [saleId, storeId, employeeUserId, saleDate, totalAmountCents]
    );

    // 3. Record Sale Line Items (Association Data)
    // Delegating to the service to insert nested data.
    await InventoryService.recordSaleLineItems(saleId, lineItems);

    // 4. Inventory Reduction (Core Business Logic)
    // Delegating the update of the Inventory Singleton Sub-resource.
    await InventoryService.reduceStockForSale(
      storeId,
      lineItems,
      employeeUserId
    ); // Use the more specific service function

    // 5. Standard 201 Created Response, returning the new Sale resource (Cap 1: Predictable)
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
    // Global error handler (in app.ts) catches custom HttpError (like 409 Conflict)
    // or generic errors (500) and ensures a predictable JSON response.
    next(error);
  }
};
