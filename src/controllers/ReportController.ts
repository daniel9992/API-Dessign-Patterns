// src/controllers/ReportController.ts

import { NextFunction, Request, Response } from "express";
import { ReportService } from "../services/ReportService";
import { HttpError } from "../utils/HttpError";

/**
 * GET /v1/stores/:storeId/stats/weekly
 * Generates sales statistics compiled by employee for the last 7 days.
 * Pattern: Custom RPC-like Read Method.
 */
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
    next(
      new HttpError("Failed to generate weekly employee stats report.", 500)
    );
  }
};

/**
 * GET /v1/stores/:storeId/shoppingLists/lowStock
 * Generates a list of products whose current stock is below 75% of their base units.
 * Pattern: Computed Singleton Sub-resource.
 */
export const getLowStockShoppingList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;

  try {
    const lowStockItems = await ReportService.getLowStockProducts(storeId);

    // Response is the computed shopping list resource
    res.status(200).json({
      storeId,
      generatedAt: new Date().toISOString(),
      listType: "LowStock",
      items: lowStockItems,
    });
  } catch (error) {
    next(new HttpError("Failed to generate low stock shopping list.", 500));
  }
};



/**
 * USEFUL FUNCTION: GET /v1/stores/:storeId/stats/productHistory/:productId
 * Retrieves the sales history (transactions and quantity) for a specific product.
 * Pattern: Nested Custom Report (Resource-specific).
 */
export const getProductSaleHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId, productId } = req.params;

  try {
    const history = await ReportService.getProductHistory(storeId, productId);

    res.status(200).json({
      storeId,
      productId,
      history: history,
    });
  } catch (error) {
    next(
      new HttpError(
        `Failed to retrieve sale history for product ${productId}.`,
        500
      )
    );
  }
};

/**
 * USEFUL FUNCTION: GET /v1/stores/:storeId/stats/unreceivedPurchases
 * Lists all outstanding purchase orders (not yet marked as isReceived=1).
 * Pattern: Custom RPC-like Read Method (Status Filter).
 */
export const getUnreceivedPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;

  try {
    const pendingPurchases = await ReportService.getPendingPurchases(storeId);

    res.status(200).json({
      storeId,
      status: "Pending Receipt",
      purchases: pendingPurchases,
    });
  } catch (error) {
    next(
      new HttpError("Failed to retrieve list of unreceived purchases.", 500)
    );
  }
};
