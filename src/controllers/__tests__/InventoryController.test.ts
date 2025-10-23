import request from 'supertest';
import app from '../../app';
import { InventoryService } from '../../services/InventoryService';
import { storeExistsMiddleware } from '../../middleware/storeAuth';

jest.mock('../../services/InventoryService');
jest.mock('../../middleware/storeAuth');

describe('InventoryController', () => {
  beforeEach(() => {
    (storeExistsMiddleware as jest.Mock).mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInventoryItem', () => {
    it('should return 201 Created with the new inventory item', async () => {
      const newItem = { productId: 'prod1', currentStock: 100 };
      (InventoryService.createInventoryItem as jest.Mock).mockResolvedValue(newItem);

      const response = await request(app)
        .post('/v1/stores/store1/inventory')
        .send({ productId: 'prod1', quantity: 100 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newItem);
    });

    it('should return 400 Bad Request if the request body is invalid', async () => {
      const response = await request(app)
        .post('/v1/stores/store1/inventory')
        .send({ productId: 'prod1' });

      expect(response.status).toBe(400);
    });
  });

  describe('getInventoryItem', () => {
    it('should return 200 OK with the inventory item', async () => {
      const mockItem = { productId: 'prod1', currentStock: 100 };
      (InventoryService.getInventoryItem as jest.Mock).mockResolvedValue(mockItem);

      const response = await request(app).get('/v1/stores/store1/inventory/prod1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockItem);
    });

    it('should return 404 Not Found if the item does not exist', async () => {
      (InventoryService.getInventoryItem as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/v1/stores/store1/inventory/prod1');

      expect(response.status).toBe(404);
    });
  });

  describe('updateInventoryItem', () => {
    it('should return 200 OK with the updated inventory item', async () => {
      const updatedItem = { productId: 'prod1', currentStock: 120 };
      (InventoryService.updateInventoryItem as jest.Mock).mockResolvedValue(updatedItem);

      const response = await request(app)
        .patch('/v1/stores/store1/inventory/prod1')
        .send({ quantity: 120 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedItem);
    });

    it('should return 400 Bad Request if the request body is invalid', async () => {
      const response = await request(app)
        .patch('/v1/stores/store1/inventory/prod1')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('deleteInventoryItem', () => {
    it('should return 204 No Content on successful deletion', async () => {
      (InventoryService.deleteInventoryItem as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/v1/stores/store1/inventory/prod1');

      expect(response.status).toBe(204);
    });

    it('should return 500 Internal Server Error if the service throws an error', async () => {
      (InventoryService.deleteInventoryItem as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app).delete('/v1/stores/store1/inventory/prod1');

      expect(response.status).toBe(500);
    });
  });
});
