import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { Model } from 'mongoose';
import { ECacheKey } from '../../common/enums';
import { NotificationService } from '../../notifications/services';
import { IAnomalyAggResult } from '../interfaces';
import { Message } from './../schemas/message.schema';
import { AnomalyDetectionService } from './anomaly-detection.service';

// Mock Data
const mockFirstRecord = {
  createdAt: new Date('2024-09-01T00:00:00Z'),
};

const anomalyIntervalMock: IAnomalyAggResult = { 
  _id: new Date('2024-09-01T00:01:00Z'), 
  count: 15 ,
};

const mockAggregationResult: IAnomalyAggResult[] = [
  { _id: new Date('2024-09-01T00:00:00Z'), count: 5 },
  anomalyIntervalMock,
  { _id: new Date('2024-09-01T00:02:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:03:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:04:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:05:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:06:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:07:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:08:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:09:00Z'), count: 5 },
  { _id: new Date('2024-09-01T00:10:00Z'), count: 5 },
];


describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let messageModel: Model<Message>;
  let redisClient: Redis;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectionService,
        {
          provide: getModelToken(Message.name),
          useValue: {
            find: jest.fn(),
            aggregate: jest.fn(),
          },
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendAlert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
    messageModel = module.get<Model<Message>>(getModelToken(Message.name));
    redisClient = module.get<Redis>('REDIS_CLIENT');
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAnalyze', () => {
    it('should exit if no messages in database', async () => {
      // Mock Redis get to return null
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Mock messageModel.find to return empty
      (messageModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Mock aggregate to return empty
      (messageModel.aggregate as jest.Mock).mockResolvedValue([]);

      await service.detectAnomalies();

      // Ensure no alerts are sent
      expect(notificationService.sendAlert).not.toHaveBeenCalled();

      // Ensure Redis set is not called
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should exit if aggregation result is empty', async () => {
      // Mock Redis get to return null
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Mock messageModel.find to return a first record
      (messageModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockFirstRecord]),
      });

      // Mock aggregate to return empty
      (messageModel.aggregate as jest.Mock).mockResolvedValue([]);

      await service.detectAnomalies();

      // Ensure no alerts are sent
      expect(notificationService.sendAlert).not.toHaveBeenCalled();

      // Ensure Redis set is not called
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should exit if not enough analytic points', async () => {
      // Mock Redis get to return null
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Mock messageModel.find to return a first record
      (messageModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockFirstRecord]),
      });

      // Mock aggregate to return less than MIN_ANALYTIC_POINTS
      const insufficientAggregationResult: IAnomalyAggResult[] = [
        { _id: new Date('2024-09-01T00:00:00Z'), count: 5 },
        { _id: new Date('2024-09-01T00:01:00Z'), count: 5 },
        { _id: new Date('2024-09-01T00:02:00Z'), count: 5 },
      ];

      (messageModel.aggregate as jest.Mock).mockResolvedValue(insufficientAggregationResult);

      await service.detectAnomalies();

      // Ensure no alerts are sent
      expect(notificationService.sendAlert).not.toHaveBeenCalled();

      // Ensure Redis set is not called
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should detect anomalies and send alerts', async () => {
      // Mock Redis get to return null
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Mock messageModel.find to return a first record
      (messageModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockFirstRecord]),
      });

      // Mock aggregate to return aggregationResult with one anomaly
      (messageModel.aggregate as jest.Mock).mockResolvedValue(mockAggregationResult);

      // Execute the method
      await service.detectAnomalies();

      // Calculate expected mean and stdDev excluding the anomaly
      const countsExcludingAnomaly = mockAggregationResult
        .map(doc => doc.count)
        .filter((_, index) => index !== 1); // Exclude the second interval

      const mean = countsExcludingAnomaly.reduce((a, b) => a + b, 0) / countsExcludingAnomaly.length;
      const variance =
        countsExcludingAnomaly.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        countsExcludingAnomaly.length;
      const stdDev = Math.sqrt(variance);

      // Verify that sendAlert was called once for the anomaly
      expect(notificationService.sendAlert).toHaveBeenCalledTimes(1);
      expect(notificationService.sendAlert).toHaveBeenCalledWith({
        interval: anomalyIntervalMock._id,
        currentCount: anomalyIntervalMock.count,
        average: mean,
        stdDev: stdDev,
      });

      // Verify that Redis set was called with the last checked interval
      expect(redisClient.set).toHaveBeenCalledWith(
        ECacheKey.lastCheckAnomalyInterval,
        mockAggregationResult[mockAggregationResult.length - 1]._id.toISOString(),
      );
    });

    it('should not send alert if no anomalies are detected', async () => {
      // Mock Redis get to return null
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      // Mock messageModel.find to return a first record
      (messageModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockFirstRecord]),
      });

      // Mock aggregate to return aggregationResult with no anomalies
      const nonAnomalousAggregationResult: IAnomalyAggResult[] = Array.from(
        { length: 15 },
        (_, index) => ({
          _id: new Date(`2024-09-01T00:${String(index).padStart(2, '0')}:00Z`),
          count: 5, // Consistent count, no anomalies
        }),
      );

      (messageModel.aggregate as jest.Mock).mockResolvedValue(nonAnomalousAggregationResult);

      // Execute the method
      await service.detectAnomalies();

      // Verify that sendAlert was not called
      expect(notificationService.sendAlert).not.toHaveBeenCalled();

      // Verify that Redis set was called with the last checked interval
      expect(redisClient.set).toHaveBeenCalledWith(
        ECacheKey.lastCheckAnomalyInterval,
        nonAnomalousAggregationResult[nonAnomalousAggregationResult.length - 1]._id.toISOString(),
      );
    });

    it('should skip intervals already checked', async () => {
      // Mock Redis get to return a date later than some intervals
      const lastCheckedDate = new Date('2024-09-01T00:05:00Z');
      (redisClient.get as jest.Mock).mockResolvedValue(lastCheckedDate.toISOString());

      // Mock messageModel.find to return a first record
      (messageModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockFirstRecord]),
      });

      const anomalyIntervalMock: IAnomalyAggResult = {
        _id: new Date('2024-09-01T00:06:00Z'), 
        count: 15,
      }

      // Mock aggregate to return aggregationResult with anomalies before and after lastCheckedDate
      const aggregationResultWithSkippedAnomalies: IAnomalyAggResult[] = [
          { _id: new Date('2024-09-01T00:00:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:01:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:02:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:03:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:04:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:05:00Z'), count: 5 }, // Before lastCheckedDate
          anomalyIntervalMock, // After lastCheckedDate - Anomaly
          { _id: new Date('2024-09-01T00:07:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:08:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:09:00Z'), count: 5 },
          { _id: new Date('2024-09-01T00:10:00Z'), count: 5 },
      ];

      (messageModel.aggregate as jest.Mock).mockResolvedValue(aggregationResultWithSkippedAnomalies);

      // Execute the method
      await service.detectAnomalies();

      // Verify that sendAlert was called only for the anomaly after lastCheckedDate
      expect(notificationService.sendAlert).toHaveBeenCalledTimes(1);
      expect(notificationService.sendAlert).toHaveBeenCalledWith({
        interval: anomalyIntervalMock._id,
        currentCount: anomalyIntervalMock.count,
        average: 5, // Mean of countsExcludingCurrent [5,5,5]
        stdDev: 0, // StdDev of countsExcludingCurrent [5,5,5]
      });

      // Verify that Redis set was called with the last checked interval
      expect(redisClient.set).toHaveBeenCalledWith(
        ECacheKey.lastCheckAnomalyInterval,
        aggregationResultWithSkippedAnomalies[aggregationResultWithSkippedAnomalies.length - 1]._id.toISOString(),
      );
    });
  });
});
