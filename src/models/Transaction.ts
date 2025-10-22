// src/models/Transaction.ts

/**
 * 1. Sale Resource and Nested Line Item Data
 * Models a single customer transaction and its component products.
 */
export interface Sale {
  saleId: string;
  storeId: string;
  employeeUserId: string;
  saleDate: Date;
  totalAmountCents: number; // Naming with unit (Cap 2)
  lineItems: SaleLineItem[]; // Nested structure containing item details
}

export interface SaleLineItem {
  productId: string;
  saleId: string;
  quantity: number;
  unitPriceCents: number;
}

/**
 * 2. Purchase Resource (Supplier Transaction)
 * Models a procurement transaction from a supplier.
 */
export interface Purchase {
  purchaseId: string;
  storeId: string;
  employeeUserId: string;
  supplierName: string;
  purchaseDate: Date;
  totalCostCents: number;
  isReceived: boolean; // Flag to indicate if stock has been physically added
  purchaseItems: PurchaseLineItem[];
}

export interface PurchaseLineItem {
  productId: string;
  purchaseId: string;
  quantityOrdered: number;
  costPriceCents: number;
}

/**
 * 3. Stock Adjustment Log (Inventory Increase/Reduction - Non-Transactional)
 * Models a manual change to inventory (e.g., waste, count correction, transfer).
 */

export type AdjustmentType =
  | "SALE"
  | "SUPPLIER_RECEIPT"
  | "LOSS_WASTE"
  | "PHYSICAL_COUNT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export interface StockAdjustment {
  adjustmentId: string;
  storeId: string;
  productId: string;
  adjustmentType: AdjustmentType;
  quantityChange: number; // Negative for reduction, Positive for increase (Naming: clear context)
  notes: string;
  performedByUserId: string;
  adjustmentDate: Date;
}
