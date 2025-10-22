import { SaleLineItem } from "./Transaction";

// Core Entities
export interface Store {
  storeId: string;
  name: string;
  locationCity: string;
  managerUserId: string; // Cross Reference
}

export interface Product {
  productId: string;
  sku: string;
  name: string;
  baseUnits: number; // Usual units (for 75% check)
}

// Store-Specific Entities
export interface Inventory {
  inventoryId: string; // The primary ID of the row
  storeId: string;
  productId: string;
  currentStock: number;
  lastUpdated: Date;
}

export interface Sale {
  saleId: string;
  storeId: string;
  employeeUserId: string;
  saleDate: Date;
  totalAmountCents: number; // Naming with units (Cap 2)
  lineItems: SaleLineItem[]; // Nested object structure for simplicity
}

export interface Purchase {
  purchaseId: string;
  storeId: string;
  employeeUserId: string;
  supplierName: string;
  purchaseDate: Date;
  isReceived: boolean;
}
