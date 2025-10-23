import request from 'supertest';
import app from '../../app';
import { InventoryService } from '../../services/InventoryService';
import dbService from '../../services/DBService';
import { storeExistsMiddleware } from '../../middleware/storeAuth';

jest.mock('../../services/InventoryService');
jest.mock('../../services/DBService');
jest.mock('../../middleware/storeAuth');

describe('SalesController', () => {
  beforeEach(() => {
    (storeExistsMiddleware as jest.Mock).mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSale', () => {
    it('should return 201 Created with the new sale', async () => {
      const mockSale = { saleId: 'sale123', totalAmountCents: 1000 };
      (InventoryService.checkStock as jest.Mock).mockResolvedValue(undefined);
      (InventoryService.recordSaleLineItems as jest.Mock).mockResolvedValue(undefined);
      (InventoryService.reduceStockForSale as jest.Mock).mockResolvedValue(undefined);
      (dbService.run as jest.Mock).mockResolvedValue({ changes: 1 });

      const response = await request(app)
        .post('/v1/stores/store1/sales')
        .send({
          employeeUserId: 'user1',
          totalAmountCents: 1000,
          lineItems: [{ productId: 'prod1', quantity: 1, unitPriceCents: 1000 }],
        });

      expect(response.status).toBe(201);
      expect(response.body.totalAmountCents).toBe(1000);
    });

    it('should return 400 Bad Request if the request body is invalid', async () => {
      const response = await request(app)
        .post('/v1/stores/store1/sales')
        .send({ employeeUserId: 'user1' });

      expect(response.status).toBe(400);
    });
  });
});
