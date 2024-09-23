// src/messages/archive.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessagesService } from './messages.service';
import { EMessagePlatform } from '../enums';

@Injectable()
export class ArchiveService {
  constructor(private readonly messagesService: MessagesService) {}

  public async archiveMessages() {
    console.log('Launch archiving messages.');

    try {
      await this.messagesService.archiveOldMessages();

      console.log('Archiving task completed!');
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  }
}
