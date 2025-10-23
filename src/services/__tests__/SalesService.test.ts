import { SalesService } from '../SalesService';
import dbService from '../DBService';
import { InventoryService } from '../InventoryService';
import { HttpError } from '../../utils/HttpError';

jest.mock('../DBService');
jest.mock('../InventoryService');

describe('SalesService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSale', () => {
    it('should create and return a sale', async () => {
      (InventoryService.checkStock as jest.Mock).mockResolvedValue(undefined);
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      (InventoryService.recordSaleLineItems as jest.Mock).mockResolvedValue(undefined);
      (InventoryService.reduceStockForSale as jest.Mock).mockResolvedValue(undefined);

      const newSale = await SalesService.createSale('store1', 'user1', 1000, [
        { saleId: 'sale1', productId: 'prod1', quantity: 1, unitPriceCents: 1000 },
      ]);

      expect(newSale).toBeDefined();
      expect(newSale.totalAmountCents).toBe(1000);
    });

    it('should throw an error if checkStock fails', async () => {
      (InventoryService.checkStock as jest.Mock).mockRejectedValue(new Error('Stock error'));
      await expect(
        SalesService.createSale('store1', 'user1', 1000, [
          { saleId: 'sale1', productId: 'prod1', quantity: 1, unitPriceCents: 1000 },
        ])
      ).rejects.toThrow('Stock error');
    });
  });

  describe('getSaleById', () => {
    it('should return a sale with line items', async () => {
      const mockSale = { saleId: 'sale1' };
      const mockLineItems = [{ productId: 'prod1' }];
      (dbService.query as jest.Mock)
        .mockResolvedValueOnce([mockSale])
        .mockResolvedValueOnce(mockLineItems);

      const sale = await SalesService.getSaleById('sale1');

      expect(sale).toBeDefined();
      expect(sale.lineItems).toEqual(mockLineItems);
    });

    it('should throw HttpError 404 if the sale is not found', async () => {
      (dbService.query as jest.Mock).mockResolvedValue([]);
      await expect(SalesService.getSaleById('sale1')).rejects.toThrow(HttpError);
      await expect(SalesService.getSaleById('sale1')).rejects.toHaveProperty('statusCode', 404);
    });
  });

  describe('getAllSales', () => {
    it('should return an array of sales', async () => {
      const mockSales = [{ saleId: 'sale1' }, { saleId: 'sale2' }];
      (dbService.query as jest.Mock).mockResolvedValue(mockSales);

      const sales = await SalesService.getAllSales('store1');

      expect(sales).toEqual(mockSales);
    });

    it('should throw an error if the database query fails', async () => {
      (dbService.query as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(SalesService.getAllSales('store1')).rejects.toThrow('DB error');
    });
  });

  describe('deleteSale', () => {
    it('should delete a sale and restock inventory', async () => {
      const mockSale = {
        saleId: 'sale1',
        storeId: 'store1',
        employeeUserId: 'user1',
        lineItems: [{ productId: 'prod1', quantity: 2 }],
      };
      jest.spyOn(SalesService, 'getSaleById').mockResolvedValue(mockSale as any);
      (InventoryService.increaseStockForPurchase as jest.Mock).mockResolvedValue(undefined);
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });

      await SalesService.deleteSale('sale1');

      expect(InventoryService.increaseStockForPurchase).toHaveBeenCalledTimes(1);
      expect(dbService.run).toHaveBeenCalledTimes(2);
    });

    it('should throw HttpError 404 if the sale is not found', async () => {
      jest.spyOn(SalesService, 'getSaleById').mockRejectedValue(new HttpError('Not found', 404));
      await expect(SalesService.deleteSale('sale1')).rejects.toThrow(HttpError);
      await expect(SalesService.deleteSale('sale1')).rejects.toHaveProperty('statusCode', 404);
    });
  });
});
