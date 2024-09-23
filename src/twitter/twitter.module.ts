// twitter.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagesModule } from '../messages/messages.module';
import { NotificationModule } from '../notifications/notification.module';
import { NotificationService } from '../notifications/services';
import { FakeTwitterStreamService, TwitterService } from './services';

@Module({
  imports: [ConfigModule, MessagesModule, NotificationModule],
  providers: [
    TwitterService,
    NotificationService,
    FakeTwitterStreamService,
  ],
})
export class TwitterModule {}
