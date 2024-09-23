import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import * as moment from 'moment';
import { unitOfTime } from 'moment';
import { Model } from 'mongoose';
import { ECacheKey } from '../../common/enums';
import { NotificationService } from '../../notifications/services';
import { IAnomalyAggResult, IAnomalyCalcResult } from '../interfaces';
import { Message, MessageDocument } from './../schemas';

@Injectable()
export class AnomalyDetectionService {
  private readonly INTERVAL_TYPE: unitOfTime.Base = 'minute';
  private readonly INTERVAL_SIZE: number = 1;
  private readonly MIN_ANALYTIC_POINTS: number = 5;

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly notificationService: NotificationService,
  ) {}

  public async detectAnomalies(): Promise<void> {
    console.log('Starte anomaly detection process!');

    await this.processAnalyze();
  }

  private async processAnalyze(): Promise<void> {
    console.log('Anomaly detection process!');
    const lastAnomalyCheck: string | null = await this.redisClient.get(ECacheKey.lastCheckAnomalyInterval);
    const lastAnomalyCheckDate: Date | null = lastAnomalyCheck ? new Date(lastAnomalyCheck) : null;
    const [firstRecord] = await this.messageModel
    .find({})
    .sort({
      createdAt: 1,
    })
    .limit(1)
    .lean();

    if(!firstRecord) return;

    const startDate: Date = moment(firstRecord?.createdAt).startOf('minute').toDate();

    // Aggregate quantity of records N interval time
    // TODO: save result into separate collection to avoid recalculate the same intervals
    const aggregationResult: IAnomalyAggResult[] = await this.messageModel.aggregate([
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$createdAt',
              unit: this.INTERVAL_TYPE,
              binSize: this.INTERVAL_SIZE
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $densify: {
          field: '_id',
          range: {
            step: this.INTERVAL_SIZE,
            // @ts-ignore
            unit: this.INTERVAL_TYPE,
            bounds: [startDate, moment().startOf('minute').toDate()]
          }
        }
      },
      {
        $set: {
          count: { $ifNull: ['$count', 0] }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    if(!aggregationResult?.length) {
      console.log(`No one any info for anomaly detection.`);

      return;
    }

    const counts: number[] = aggregationResult.map(doc => doc.count);
    // Filter only uncalculated intervals
    const intervals: Date[] = aggregationResult.map(doc => doc._id);

    // If data is not enough to calc then skip
    if (counts.length < this.MIN_ANALYTIC_POINTS) {
      return;
    }

    let lastCheckedIntervalDate: Date;

    for (let i = 0; i < counts.length; i++) {
      // Exclude the current interval from calculation
      const countsExcludingCurrent = counts.slice(0, i).concat(counts.slice(i + 1));
      const intervalDate: Date = intervals[i];

      // If this interval has already been checked
      if(lastAnomalyCheckDate && intervalDate < lastAnomalyCheckDate) {
        continue;
      }

      // TODO: use precalculated values from DB
      // Calculate mean and standart deviation
      const mean: number = this.calculateMean(countsExcludingCurrent);
      const stdDev: number = this.calculateStdDev(countsExcludingCurrent, mean);
      const currentCount: number = counts[i];
      const currentInterval: Date = intervals[i];

      // Detection using 3 sigma rule
      if (currentCount > mean + 3 * stdDev || currentCount < mean - 3 * stdDev) {
        this.notificationService.sendAlert({
          interval: currentInterval,
          currentCount,
          average: mean,
          stdDev,
        });
      }

      lastCheckedIntervalDate = currentInterval;
    }

    if(lastCheckedIntervalDate) {
      await this.redisClient.set(ECacheKey.lastCheckAnomalyInterval, lastCheckedIntervalDate.toISOString());
    }
  }

  /**
   * Calculates the mean value for array of numbers
   */
  private calculateMean(data: number[]): number {
    const sum: number = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  /**
   * Calculates the standard deviation of an array of numbers.
   */
  private calculateStdDev(data: number[], mean: number): number {
    const variance: number = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }
}
