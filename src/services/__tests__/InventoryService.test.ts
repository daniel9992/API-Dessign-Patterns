import { InventoryService } from '../InventoryService';
import dbService from '../DBService';
import { HttpError } from '../../utils/HttpError';

jest.mock('../DBService');

describe('InventoryService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkStock', () => {
    it('should resolve successfully if all items are in stock', async () => {
      (dbService.query as jest.Mock).mockResolvedValue([{ currentStock: 10 }]);
      const lineItems = [{ productId: 'prod1', quantity: 5 }];

      await expect(
        InventoryService.checkStock('store1', lineItems)
      ).resolves.toBeUndefined();
    });

    it('should throw HttpError 409 if an item is out of stock', async () => {
      (dbService.query as jest.Mock).mockResolvedValue([{ currentStock: 3 }]);
      const lineItems = [{ productId: 'prod1', quantity: 5 }];

      await expect(
        InventoryService.checkStock('store1', lineItems)
      ).rejects.toThrow(HttpError);
      await expect(
        InventoryService.checkStock('store1', lineItems)
      ).rejects.toHaveProperty('statusCode', 409);
    });
  });

  describe('markPurchaseReceived', () => {
    it('should mark a purchase as received and return the purchase object', async () => {
      const mockPurchase = { purchaseId: 'pur123', isReceived: false };
      const mockLineItems = [{ productId: 'prod1', quantityOrdered: 10 }];
      (dbService.query as jest.Mock)
        .mockResolvedValueOnce([mockPurchase])
        .mockResolvedValueOnce(mockLineItems);
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });

      const result = await InventoryService.markPurchaseReceived('store1', 'pur123', 'user1');

      expect(dbService.run).toHaveBeenCalledWith(
        'UPDATE Purchases SET isReceived = 1, employeeUserId = ? WHERE purchaseId = ?',
        ['user1', 'pur123']
      );
      expect(result).toBeDefined();
      expect(result.isReceived).toBe(true);
    });

    it('should throw HttpError 404 if the purchase is not found', async () => {
      (dbService.query as jest.Mock).mockResolvedValue([]);

      await expect(
        InventoryService.markPurchaseReceived('store1', 'pur123', 'user1')
      ).rejects.toThrow(HttpError);
      await expect(
        InventoryService.markPurchaseReceived('store1', 'pur123', 'user1')
      ).rejects.toHaveProperty('statusCode', 404);
    });
  });

  describe('applyStockChange', () => {
    it('should apply a stock change and return the new stock level', async () => {
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      (dbService.query as jest.Mock).mockResolvedValue([{ currentStock: 110 }]);

      const result = await InventoryService.applyStockChange('store1', 'prod1', 10, 'user1', 'SUPPLIER_RECEIPT');

      expect(dbService.run).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ newStock: 110 });
    });

    it('should throw an error if the database query fails', async () => {
      (dbService.run as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        InventoryService.applyStockChange('store1', 'prod1', 10, 'user1', 'SUPPLIER_RECEIPT')
      ).rejects.toThrow('DB error');
    });
  });

  describe('reduceStockForSale', () => {
    it('should call applyStockChange with a negative quantity for each line item', async () => {
      const spy = jest.spyOn(InventoryService, 'applyStockChange').mockResolvedValue({ newStock: 1 });
      const lineItems = [
        { saleId: 'sale1', productId: 'prod1', quantity: 2, unitPriceCents: 100 },
        { saleId: 'sale1', productId: 'prod2', quantity: 3, unitPriceCents: 200 },
      ];

      await InventoryService.reduceStockForSale('store1', lineItems, 'user1');

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith('store1', 'prod1', -2, 'user1', 'SALE', 'Sale transaction sale1');
      expect(spy).toHaveBeenCalledWith('store1', 'prod2', -3, 'user1', 'SALE', 'Sale transaction sale1');
      spy.mockRestore();
    });

    it('should throw an error if applyStockChange fails', async () => {
      const spy = jest.spyOn(InventoryService, 'applyStockChange').mockRejectedValue(new Error('DB error'));
      const lineItems = [{ saleId: 'sale1', productId: 'prod1', quantity: 2, unitPriceCents: 100 }];

      await expect(InventoryService.reduceStockForSale('store1', lineItems, 'user1')).rejects.toThrow('DB error');
      spy.mockRestore();
    });
  });

  describe('processPurchase', () => {
    it('should create a purchase and increase stock if received', async () => {
      const spy = jest.spyOn(InventoryService, 'increaseStockForPurchase').mockResolvedValue();
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      const purchaseData = {
        employeeUserId: 'user1',
        supplierName: 'Supplier A',
        totalCostCents: 1000,
        isReceived: true,
        purchaseItems: [{ productId: 'prod1', quantityOrdered: 10, costPriceCents: 100 }],
      };

      const result = await InventoryService.processPurchase('store1', purchaseData as any);

      expect(dbService.run).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.purchaseId).toBeDefined();
      spy.mockRestore();
    });

    it('should create a purchase and not increase stock if not received', async () => {
      const spy = jest.spyOn(InventoryService, 'increaseStockForPurchase').mockResolvedValue();
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      const purchaseData = {
        employeeUserId: 'user1',
        supplierName: 'Supplier A',
        totalCostCents: 1000,
        isReceived: false,
        purchaseItems: [],
      };

      await InventoryService.processPurchase('store1', purchaseData as any);

      expect(dbService.run).toHaveBeenCalledTimes(1);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('increaseStockForPurchase', () => {
    it('should call applyStockChange with a positive quantity for each line item', async () => {
      const spy = jest.spyOn(InventoryService, 'applyStockChange').mockResolvedValue({ newStock: 1 });
      const purchaseItems = [
        { purchaseId: 'pur1', productId: 'prod1', quantityOrdered: 10, costPriceCents: 100 },
        { purchaseId: 'pur1', productId: 'prod2', quantityOrdered: 5, costPriceCents: 200 },
      ];

      await InventoryService.increaseStockForPurchase('store1', purchaseItems, 'user1');

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith('store1', 'prod1', 10, 'user1', 'SUPPLIER_RECEIPT', 'Purchase receipt pur1');
      expect(spy).toHaveBeenCalledWith('store1', 'prod2', 5, 'user1', 'SUPPLIER_RECEIPT', 'Purchase receipt pur1');
      spy.mockRestore();
    });

    it('should throw an error if applyStockChange fails', async () => {
      const spy = jest.spyOn(InventoryService, 'applyStockChange').mockRejectedValue(new Error('DB error'));
      const purchaseItems = [{ purchaseId: 'pur1', productId: 'prod1', quantityOrdered: 10, costPriceCents: 100 }];

      await expect(InventoryService.increaseStockForPurchase('store1', purchaseItems, 'user1')).rejects.toThrow('DB error');
      spy.mockRestore();
    });
  });

  describe('recordSaleLineItems', () => {
    it('should insert a record for each line item', async () => {
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      const lineItems = [
        { saleId: 'sale1', productId: 'prod1', quantity: 2, unitPriceCents: 100 },
        { saleId: 'sale1', productId: 'prod2', quantity: 3, unitPriceCents: 200 },
      ];

      await InventoryService.recordSaleLineItems('sale1', lineItems);

      expect(dbService.run).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if the database insert fails', async () => {
      (dbService.run as jest.Mock).mockRejectedValue(new Error('DB error'));
      const lineItems = [{ saleId: 'sale1', productId: 'prod1', quantity: 2, unitPriceCents: 100 }];

      await expect(InventoryService.recordSaleLineItems('sale1', lineItems)).rejects.toThrow('DB error');
    });
  });

  describe('createInventoryItem', () => {
    it('should create and return an inventory item', async () => {
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      const newItem = await InventoryService.createInventoryItem('store1', 'prod1', 100);
      expect(newItem).toEqual({ productId: 'prod1', currentStock: 100 });
      expect(dbService.run).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database insert fails', async () => {
      (dbService.run as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(InventoryService.createInventoryItem('store1', 'prod1', 100)).rejects.toThrow('DB error');
    });
  });

  describe('getInventoryItem', () => {
    it('should return an inventory item', async () => {
      const mockItem = { productId: 'prod1', currentStock: 100 };
      (dbService.query as jest.Mock).mockResolvedValue([mockItem]);
      const item = await InventoryService.getInventoryItem('store1', 'prod1');
      expect(item).toEqual(mockItem);
      expect(dbService.query).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database query fails', async () => {
      (dbService.query as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(InventoryService.getInventoryItem('store1', 'prod1')).rejects.toThrow('DB error');
    });
  });

  describe('updateInventoryItem', () => {
    it('should update and return an inventory item', async () => {
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      const updatedItem = await InventoryService.updateInventoryItem('store1', 'prod1', 120);
      expect(updatedItem).toEqual({ productId: 'prod1', currentStock: 120 });
      expect(dbService.run).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database update fails', async () => {
      (dbService.run as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(InventoryService.updateInventoryItem('store1', 'prod1', 120)).rejects.toThrow('DB error');
    });
  });

  describe('deleteInventoryItem', () => {
    it('should delete an inventory item', async () => {
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });
      await InventoryService.deleteInventoryItem('store1', 'prod1');
      expect(dbService.run).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the database delete fails', async () => {
      (dbService.run as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(InventoryService.deleteInventoryItem('store1', 'prod1')).rejects.toThrow('DB error');
    });
  });
});
