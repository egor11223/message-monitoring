import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { EMessagePlatform } from '../../messages/enums';
import { Message } from '../../messages/schemas';
import { MessagesService, PlatformService } from '../../messages/services';
import { FakeTwitterStreamService } from './fake-twitter-stream.service';
import { ITwitterStreamPost } from '../interfaces';

@Injectable()
export class TwitterService
  extends PlatformService
  implements OnModuleInit
{
  private stream: Readable;

  private hashtag: string;

  constructor(
    private configService: ConfigService,
    private messagesService: MessagesService,
    private fakeTwitterStreamService: FakeTwitterStreamService,
  ) {
    super();
    this.hashtag = configService.get('TWEET_HASHTAG');
  }

  async onModuleInit() {
    await this.startListening();
  }

  protected async startListening() {
    // Replace this row into call /2/tweets/search/stream/rules to set hashtag and /2/tweets/search/stream to start tweet stream.
    // Note: /2/tweets/search/stream will only return tweets that match the hashtag rules.
    this.stream = this.fakeTwitterStreamService.startStream();

    this.stream.on('data', async ({ data: tweets }) => {
      await this.processMessage(tweets);
    });

    this.stream.on('end', () => {
      this.restartListening();
      console.log('Twitter Stream ended');
    });

    this.stream.on('error', (error) => {
      this.restartListening();
      console.error('Error Twitter Stream:', error);
    });
  }

  private restartListening() {
    this.stream.removeAllListeners();
    this.stream.destroy();
    this.startListening();
  }

  protected async processMessage(tweets: ITwitterStreamPost[]) {
    const messageData: Partial<Message>[] = tweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      createdAt: new Date(tweet.created_at),
      platform: EMessagePlatform.twitter,
      key: this.hashtag,
      additionalData: {
        hashtags: tweet.entities.hashtags,
      }
    }));


    await this.messagesService.create(messageData);
  }
}
