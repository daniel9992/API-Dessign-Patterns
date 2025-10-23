import request from 'supertest';
import app from '../../app';
import { ReportService } from '../../services/ReportService';
import { storeExistsMiddleware } from '../../middleware/storeAuth';
import dbService from '../../services/DBService';

jest.mock('../../services/ReportService');
jest.mock('../../middleware/storeAuth');
jest.mock('../../services/DBService');

describe('ReportController', () => {
  beforeEach(() => {
    (storeExistsMiddleware as jest.Mock).mockImplementation((req, res, next) => next());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeeklyEmployeeStats', () => {
    it('should return 200 OK with weekly stats', async () => {
      const mockStats = [{ employeeName: 'John Doe', totalSales: 500 }];
      (ReportService.calculateWeeklyStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app).get('/v1/stores/store1/stats/weekly');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should return 500 Internal Server Error if the service throws an error', async () => {
      (ReportService.calculateWeeklyStats as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/v1/stores/store1/stats/weekly');

      expect(response.status).toBe(500);
    });
  });
});
