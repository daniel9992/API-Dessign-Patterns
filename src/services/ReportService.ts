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
}
