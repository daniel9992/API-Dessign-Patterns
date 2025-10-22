import { ReportService } from '../ReportService';
import dbService from '../DBService';

jest.mock('../DBService');

describe('ReportService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateWeeklyStats', () => {
    it('should return an array of weekly stats', async () => {
      const mockStats = [{ employeeName: 'John Doe', totalSales: 500 }];
      (dbService.query as jest.Mock).mockResolvedValue(mockStats);

      const result = await ReportService.calculateWeeklyStats('store1');

      expect(result).toEqual(mockStats);
      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database query fails', async () => {
      (dbService.query as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(ReportService.calculateWeeklyStats('store1')).rejects.toThrow('DB error');
    });
  });

  describe('getLowStockProducts', () => {
    it('should return an array of low stock products', async () => {
      const mockProducts = [{ productName: 'Product A', currentStock: 5 }];
      (dbService.query as jest.Mock).mockResolvedValue(mockProducts);

      const result = await ReportService.getLowStockProducts('store1');

      expect(result).toEqual(mockProducts);
      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database query fails', async () => {
      (dbService.query as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(ReportService.getLowStockProducts('store1')).rejects.toThrow('DB error');
    });
  });

  describe('getPendingPurchases', () => {
    it('should return an array of pending purchases', async () => {
      const mockPurchases = [{ purchaseId: 'pur123', supplierName: 'Supplier B' }];
      (dbService.query as jest.Mock).mockResolvedValue(mockPurchases);

      const result = await ReportService.getPendingPurchases('store1');

      expect(result).toEqual(mockPurchases);
      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database query fails', async () => {
      (dbService.query as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(ReportService.getPendingPurchases('store1')).rejects.toThrow('DB error');
    });
  });

  describe('getProductHistory', () => {
    it('should return an array of product history', async () => {
      const mockHistory = [{ saleId: 'sale123', quantity: 2 }];
      (dbService.query as jest.Mock).mockResolvedValue(mockHistory);

      const result = await ReportService.getProductHistory('store1', 'prod1');

      expect(result).toEqual(mockHistory);
      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database query fails', async () => {
      (dbService.query as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(ReportService.getProductHistory('store1', 'prod1')).rejects.toThrow('DB error');
    });
  });
});
