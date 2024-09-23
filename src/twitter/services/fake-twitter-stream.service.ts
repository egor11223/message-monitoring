import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { faker } from '@faker-js/faker';
import { ITwitterStreamPost } from '../interfaces';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FakeTwitterStreamService extends EventEmitter {
  private isStreaming: boolean = false;
  private stream: Readable;

  constructor(
    private configService: ConfigService,
  ) {
    super();
  }

  public startStream(): Readable {
    this.stream = new Readable({
      objectMode: true,
      read: () => {},
    });
    this.isStreaming = true;
    this.streamFakeTweets();

    return this.stream;
  }

  public stopStream(): void {
    this.isStreaming = false;
    this.stream.push(null); // Close stream
  }

  public getStream(): Readable {
    return this.stream;
  }

  private async streamFakeTweets(): Promise<void> {
    while (this.isStreaming) {
      const tweets: ITwitterStreamPost[] = this.generateFakeTweets(faker.number.int({
        min: 1,
        max: 4,
      }));
      this.stream.push({ data: tweets });
      await this.sleep(faker.number.int({
        min: 1000,
        max: 1000,
      })); // Gen auto every 1s
    }
  }

  private generateFakeTweet(): ITwitterStreamPost {
    const randomHashtags: string[] = [this.configService.get('TWEET_HASHTAG')];
    const hashTagCount: number = faker.number.int({
      min: 2,
      max: 5,
    });

    for(let tagIndex = 0; tagIndex < hashTagCount; tagIndex++) {
      randomHashtags.push(faker.lorem.word(5));
    }

    return {
      id: faker.string.uuid(),
      text: faker.lorem.sentence(),
      author_id: faker.string.uuid(),
      created_at: new Date().toISOString(),
      entities: {
        hashtags: randomHashtags,
      }
    };
  }

  private generateFakeTweets(quantity: number): ITwitterStreamPost[] {
    const entities: ITwitterStreamPost[] = [];

    for (let i = 0; i < quantity; i++) {
      entities.push(this.generateFakeTweet());
    }

    return entities;
  }

  private sleep(ms: number): Promise<number> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
