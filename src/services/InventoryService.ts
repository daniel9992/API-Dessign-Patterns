// src/services/InventoryService.ts

import { v4 as uuidv4 } from "uuid";
import {
  AdjustmentType,
  Purchase,
  PurchaseLineItem,
  SaleLineItem,
} from "../models/Transaction";
import { HttpError } from "../utils/HttpError";
import dbService from "./DBService";

interface SimpleInventoryResult {
  currentStock: number;
}
export class InventoryService {
  // --- Core Inventory Check ---

  /**
   * Performs a critical check to ensure all items in a sale or adjustment are in stock.
   */
  public static async checkStock(
    storeId: string,
    lineItems: { productId: string; quantity: number }[]
  ): Promise<void> {
    for (const item of lineItems) {
      // Use the SimpleInventoryResult type for the query result
      const [inventory] = await dbService.query<SimpleInventoryResult>(
        "SELECT currentStock FROM Inventory WHERE storeId = ? AND productId = ?",
        [storeId, item.productId]
      );

      if (!inventory || inventory.currentStock < item.quantity) {
        throw new HttpError(
          `Insufficient stock for product ${item.productId}. Requested: ${
            item.quantity
          }, Available: ${inventory ? inventory.currentStock : 0}`,
          409
        );
      }
    }
  }

  /**
   * Marks a purchase resource as received and returns the full purchase object
   * including line items, making it available for inventory increase.
   * @throws HttpError if purchase is not found or already received.
   */
  public static async markPurchaseReceived(
    storeId: string,
    purchaseId: string,
    employeeUserId: string
  ): Promise<Purchase> {
    const timestamp = new Date().toISOString();

    // 1. Check current status and existence
    const [purchase] = await dbService.query<Purchase>(
      "SELECT purchaseId, isReceived, purchaseDate, totalCostCents, supplierName, employeeUserId FROM Purchases WHERE storeId = ? AND purchaseId = ?",
      [storeId, purchaseId]
    );

    if (!purchase) {
      throw new HttpError(
        `Purchase ${purchaseId} not found in store ${storeId}.`,
        404
      );
    }
    if (purchase.isReceived) {
      throw new HttpError(
        `Purchase ${purchaseId} has already been received.`,
        409
      );
    }

    // 2. Update the Purchase resource status (PATCH logic)
    await dbService.run(
      "UPDATE Purchases SET isReceived = 1, employeeUserId = ? WHERE purchaseId = ?",
      [employeeUserId, purchaseId]
    );

    // 3. Fetch the associated line items for the inventory increase step
    const lineItems = await dbService.query<PurchaseLineItem>(
      "SELECT productId, quantityOrdered, costPriceCents FROM PurchaseLineItems WHERE purchaseId = ?",
      [purchaseId]
    );

    // Return the complete resource for the controller to use in the next step
    return {
      ...purchase,
      isReceived: true,
      employeeUserId,
      purchaseItems: lineItems, // Attach items for the inventory update function
    };
  }
  // --- Core Inventory Update Logic (Reusable) ---

  /**
   * Applies a stock change (positive or negative) and logs the adjustment.
   * NOTE: In a production system, this must be wrapped in a DB TRANSACTION.
   */
  public static async applyStockChange(
    storeId: string,
    productId: string,
    quantityChange: number,
    performedByUserId: string,
    adjustmentType: AdjustmentType, // <-- FIXED: Using the defined type
    notes: string = ""
  ): Promise<{ newStock: number }> {
    const timestamp = new Date().toISOString();

    // 1. Log the Adjustment
    await dbService.run(
      `INSERT INTO StockAdjustments (adjustmentId, storeId, productId, adjustmentType, quantityChange, performedByUserId, adjustmentDate, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        storeId,
        productId,
        adjustmentType,
        quantityChange,
        performedByUserId,
        timestamp,
        notes,
      ]
    );

    // 2. Update Inventory Singleton Sub-resource
    const updateResult = await dbService.run(
      `UPDATE Inventory SET currentStock = currentStock + ?, lastUpdated = ? 
         WHERE storeId = ? AND productId = ?`,
      [quantityChange, timestamp, storeId, productId]
    );

    if (updateResult.changes === 0) {
      // Upsert logic: insert if not found
      await dbService.run(
        `INSERT INTO Inventory (storeId, productId, currentStock, lastUpdated) 
              VALUES (?, ?, ?, ?)`,
        [storeId, productId, quantityChange, timestamp]
      );
    }

    // 3. Fetch and return the new stock level
    const [newInventory] = await dbService.query<SimpleInventoryResult>(
      "SELECT currentStock FROM Inventory WHERE storeId = ? AND productId = ?",
      [storeId, productId]
    );
    return { newStock: newInventory.currentStock };
  }

  // --- Sales Reduction Logic ---

  /**
   * Reduces stock after a sale, applying the Inventory Reduction logic.
   */
  public static async reduceStockForSale(
    storeId: string,
    lineItems: SaleLineItem[],
    employeeUserId: string
  ): Promise<void> {
    for (const item of lineItems) {
      // Quantity change is negative for reduction
      await this.applyStockChange(
        storeId,
        item.productId,
        -item.quantity, // Negative value
        employeeUserId,
        "SALE",
        `Sale transaction ${item.saleId}` // Assuming saleId is added to line items before this call
      );
    }
  }

  // --- Supplier Purchase Logic (Inventory Increase) ---

  /**
   * Creates the Purchase resource and handles the Inventory Increase if received.
   * This logic is often called from a separate Purchase Controller/Service.
   */
  public static async processPurchase(
    storeId: string,
    purchaseData: Purchase
  ): Promise<Purchase> {
    const purchaseId = uuidv4();
    const {
      employeeUserId,
      supplierName,
      totalCostCents,
      isReceived,
      purchaseItems,
    } = purchaseData;

    // 1. Insert the Purchase record
    await dbService.run(
      `INSERT INTO Purchases (purchaseId, storeId, employeeUserId, supplierName, totalCostCents, isReceived, purchaseDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseId,
        storeId,
        employeeUserId,
        supplierName,
        totalCostCents,
        isReceived,
        new Date().toISOString(),
      ]
    );

    // 2. If already received, trigger the inventory increase
    if (isReceived) {
      await this.increaseStockForPurchase(
        storeId,
        purchaseItems,
        employeeUserId
      );
    }

    return { ...purchaseData, purchaseId };
  }

  /**
   * Increases stock upon receipt of purchased goods.
   */
  public static async increaseStockForPurchase(
    storeId: string,
    purchaseItems: PurchaseLineItem[],
    employeeUserId: string
  ): Promise<void> {
    for (const item of purchaseItems) {
      await this.applyStockChange(
        storeId,
        item.productId,
        item.quantityOrdered, // Positive value
        employeeUserId,
        "SUPPLIER_RECEIPT",
        `Purchase receipt ${item.purchaseId}`
      );
    }
  }

  /**
   * Records all individual products and quantities sold (line items) associated
   * with a single Sale resource ID.
   * This is a crucial step to maintain the integrity of the Sale resource.
   * @param saleId The ID of the parent Sale resource.
   * @param lineItems Array of products sold in the transaction.
   */
  public static async recordSaleLineItems(
    saleId: string,
    lineItems: SaleLineItem[]
  ): Promise<void> {
    if (lineItems.length === 0) return;

    // We intentionally build and run promises to execute batch inserts
    const insertPromises = lineItems.map((item) => {
      const sql = `
        INSERT INTO SaleLineItems (saleId, productId, quantity, unitPriceCents)
        VALUES (?, ?, ?, ?)
      `;
      return dbService.run(sql, [
        saleId,
        item.productId,
        item.quantity,
        item.unitPriceCents,
      ]);
    });

    await Promise.all(insertPromises);
  }
}
