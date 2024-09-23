// messages.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationModule } from '../notifications/notification.module';
import { NotificationService } from '../notifications/services';
import { Message, MessageSchema } from './schemas/message.schema';
import { AnomalyDetectionService } from './services';
import { ArchiveService } from './services/archive.service';
import { MessagesService } from './services/messages.service';
import { TaskService } from './services/task.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    NotificationModule,
  ],
  providers: [
    MessagesService, 
    ArchiveService,
    TaskService,
    AnomalyDetectionService,
    NotificationService,
  ],
  exports: [MessagesService],
})
export class MessagesModule {}
