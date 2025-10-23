import request from 'supertest';
import app from '../../app';
import { InventoryService } from '../../services/InventoryService';
import dbService from '../../services/DBService';
import { storeExistsMiddleware } from '../../middleware/storeAuth';
import { SalesService } from '../../services/SalesService';
import { HttpError } from '../../utils/HttpError';

jest.mock('../../services/InventoryService');
jest.mock('../../services/DBService');
jest.mock('../../middleware/storeAuth');
jest.mock('../../services/SalesService');

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
      (SalesService.createSale as jest.Mock).mockResolvedValue(mockSale);

      const response = await request(app)
        .post('/v1/stores/store1/sales')
        .send({
          employeeUserId: 'user1',
          totalAmountCents: 1000,
          lineItems: [{ productId: 'prod1', quantity: 1, unitPriceCents: 1000 }],
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockSale);
    });

    it('should return 400 Bad Request if the request body is invalid', async () => {
      (SalesService.createSale as jest.Mock).mockRejectedValue(new HttpError('Invalid request', 400));
      const response = await request(app)
        .post('/v1/stores/store1/sales')
        .send({ employeeUserId: 'user1' });

      expect(response.status).toBe(400);
    });
  });

  describe('getSaleById', () => {
    it('should return 200 OK with the sale', async () => {
      const mockSale = { saleId: 'sale1' };
      (SalesService.getSaleById as jest.Mock).mockResolvedValue(mockSale);

      const response = await request(app).get('/v1/stores/store1/sales/sale1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSale);
    });

    it('should return 404 Not Found if the sale does not exist', async () => {
      (SalesService.getSaleById as jest.Mock).mockRejectedValue(new HttpError('Not found', 404));

      const response = await request(app).get('/v1/stores/store1/sales/sale1');

      expect(response.status).toBe(404);
    });
  });

  describe('getAllSales', () => {
    it('should return 200 OK with an array of sales', async () => {
      const mockSales = [{ saleId: 'sale1' }, { saleId: 'sale2' }];
      (SalesService.getAllSales as jest.Mock).mockResolvedValue(mockSales);

      const response = await request(app).get('/v1/stores/store1/sales');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSales);
    });
  });

  describe('deleteSale', () => {
    it('should return 204 No Content on successful deletion', async () => {
      (SalesService.deleteSale as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/v1/stores/store1/sales/sale1');

      expect(response.status).toBe(204);
    });

    it('should return 404 Not Found if the sale does not exist', async () => {
      (SalesService.deleteSale as jest.Mock).mockRejectedValue(new HttpError('Not found', 404));

      const response = await request(app).delete('/v1/stores/store1/sales/sale1');

      expect(response.status).toBe(404);
    });
  });
});
