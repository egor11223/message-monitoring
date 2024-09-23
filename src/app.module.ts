import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { MessagesModule } from './messages/messages.module';
import { NotificationModule } from './notifications/notification.module';
import { TwitterModule } from './twitter/twitter.module';
import { RedisModule } from './infra/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MessagesModule,
    TwitterModule,
    NotificationModule,
    EventEmitterModule.forRoot(),
    RedisModule,
  ],
})
export class AppModule {}
