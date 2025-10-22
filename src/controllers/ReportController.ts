import { ReportService } from "services/ReportService";

// GET /stores/:storeId/stats/weekly
export const getWeeklyEmployeeStats = async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const stats = await ReportService.calculateWeeklyStats(storeId);
  res.status(200).json(stats);
};

// GET /stores/:storeId/shoppingLists/lowStock
export const getLowStockShoppingList = async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const lowStock = await ReportService.getLowStockProducts(storeId);

  // The response is the computed shopping list resource
  res.status(200).json({
    generatedDate: new Date().toISOString(),
    storeId,
    items: lowStock,
  });
};
