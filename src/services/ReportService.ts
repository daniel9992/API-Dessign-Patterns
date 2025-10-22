// src/services/ReportService.ts

import dbService from "./DBService";

export class ReportService {
  /**
   * Calculates sales statistics over the last 7 days, compiled by employee.
   * (Required by the prompt)
   */
  public static async calculateWeeklyStats(storeId: string): Promise<any[]> {
    // This query JOINs Sales and Users and groups results by the employee who processed the sale.
    const query = `
      SELECT 
        T1.employeeUserId, 
        T2.name AS employeeName, 
        COUNT(T1.saleId) AS totalTransactions,
        SUM(T1.totalAmountCents) AS totalSalesCents
      FROM Sales T1
      JOIN Users T2 ON T1.employeeUserId = T2.userId
      WHERE T1.storeId = ? AND T1.saleDate >= date('now', '-7 days')
      GROUP BY T1.employeeUserId, T2.name
      ORDER BY totalSalesCents DESC
    `;

    return dbService.query(query, [storeId]);
  }

  /**
   * Generates the list of products below 75% of their usual stock units.
   * (Required by the prompt - The "Shopping List" computed resource)
   */
  public static async getLowStockProducts(storeId: string): Promise<any[]> {
    // This query JOINs Inventory (Singleton) and Products (Global) to check against baseUnits.
    const query = `
      SELECT 
        T1.productId, 
        T2.name, 
        T2.sku, 
        T1.currentStock, 
        T2.baseUnits,
        (T2.baseUnits * 0.75) AS threshold,
        (T2.baseUnits - T1.currentStock) AS quantityToOrder -- Simple suggestion
      FROM Inventory T1
      JOIN Products T2 ON T1.productId = T2.productId
      WHERE T1.storeId = ? 
        -- Logic: currentStock is below 75% of its usual baseUnits
        AND T1.currentStock < (T2.baseUnits * 0.75)
      ORDER BY T1.currentStock ASC
    `;

    // The result is the raw data for the computed 'shoppingLists/lowStock' resource
    return dbService.query(query, [storeId]);
  }

  // --------------------------------------------------------------------------
  // New Reporting Methods
  // --------------------------------------------------------------------------

  /**
   * Retrieves the list of outstanding Purchase resources (isReceived = 0).
   */
  public static async getPendingPurchases(storeId: string): Promise<any[]> {
    const query = `
            SELECT purchaseId, supplierName, totalCostCents, purchaseDate, employeeUserId
            FROM Purchases 
            WHERE storeId = ? AND isReceived = 0
            ORDER BY purchaseDate ASC
        `;
    return dbService.query(query, [storeId]);
  }

  /**
   * Retrieves the detailed sales history for a single product within a store.
   */
  public static async getProductHistory(
    storeId: string,
    productId: string
  ): Promise<any[]> {
    // Joins Sales, SaleLineItems, and Users for a comprehensive audit trail
    const query = `
            SELECT 
                T1.saleId, 
                T1.saleDate, 
                T2.quantity, 
                T2.unitPriceCents,
                T3.name AS employeeName
            FROM Sales T1
            JOIN SaleLineItems T2 ON T1.saleId = T2.saleId
            JOIN Users T3 ON T1.employeeUserId = T3.userId
            WHERE T1.storeId = ? AND T2.productId = ?
            ORDER BY T1.saleDate DESC
        `;

    return dbService.query(query, [storeId, productId]);
  }
}
