import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArchiveService } from './archive.service';
import { AnomalyDetectionService } from './anomaly-detection.service';

@Injectable()
export class TaskService {
  constructor(
    private readonly archiveService: ArchiveService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
  ) {}

    /**
   * Every minute task
   */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleCron() {
      console.log('Launch archiving messages.');
  
      try {
        await this.anomalyDetectionService.detectAnomalies();
        await this.archiveService.archiveMessages();
  
        console.log('Every minute task completed!');
      } catch (error) {
        console.error('Every minute task error:', error);
      }
    }
}