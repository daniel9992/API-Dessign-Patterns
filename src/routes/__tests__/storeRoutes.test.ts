import request from 'supertest';
import app from '../../app';
import dbService from '../../services/DBService';

jest.mock('../../services/DBService');

describe('Store Routes', () => {
  describe('GET /v1/stores/:storeId/inventory', () => {
    it('should return 404 Not Found if the store does not exist', async () => {
      const storeId = 'non-existent-store';
      (dbService.query as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get(`/v1/stores/${storeId}/inventory`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`Store with ID ${storeId} not found.`);
    });
  });
});
