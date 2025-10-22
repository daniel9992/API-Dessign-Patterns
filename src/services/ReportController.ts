// src/controllers/ReportController.ts

import { NextFunction, Request, Response } from "express";
import { ReportService } from "../services/ReportService";

// GET /v1/stores/:storeId/stats/weekly
// Generates sales statistics compiled by the employee
export const getWeeklyEmployeeStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;

  try {
    const stats = await ReportService.calculateWeeklyStats(storeId);

    // Response is the computed report data
    res.status(200).json({
      storeId,
      period: "Last 7 Days",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// GET /v1/stores/:storeId/shoppingLists/lowStock
// Generates the weekly inventory check list
export const getLowStockShoppingList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;

  try {
    const lowStock = await ReportService.getLowStockProducts(storeId);

    // Response is a computed resource (the ShoppingList)
    res.status(200).json({
      storeId,
      generatedAt: new Date().toISOString(),
      listType: "LowStock",
      items: lowStock,
    });
  } catch (error) {
    next(error);
  }
};

// --- Report Service Logic (Conceptual) ---
export class ReportService {
  // Calculates sales statistics over the last week by joining Sales and Users
  public static async calculateWeeklyStats(storeId: string): Promise<any> {
    // Implementation uses complex SQL joins and aggregation (e.g., SUM, GROUP BY)
    // ...
    return [
      {
        employeeUserId: "emp_001",
        name: "Alice",
        totalSalesCents: 150000,
        transactions: 15,
      },
      {
        employeeUserId: "emp_002",
        name: "Bob",
        totalSalesCents: 95000,
        transactions: 10,
      },
    ];
  }

  // Computes a list of products requiring restocking
  public static async getLowStockProducts(storeId: string): Promise<any[]> {
    // Implementation:
    // SELECT ... WHERE currentStock < (baseUnits * 0.75)
    // ...
    return [
      {
        productId: "prod_101",
        name: "Milk (Gallon)",
        currentStock: 5,
        baseUnits: 20,
        needed: 10,
      },
      {
        productId: "prod_105",
        name: "Coffee Beans",
        currentStock: 25,
        baseUnits: 120,
        needed: 65,
      },
    ];
  }
}
