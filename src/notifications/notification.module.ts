import { Module } from '@nestjs/common';
import { NotificationService } from './services';

@Module({
  providers: [NotificationService]
})
export class NotificationModule {}
