// messages.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EMessagePlatform } from '../enums';
import { Message, MessageDocument } from './../schemas';

@Injectable()
export class MessagesService {
  public static readonly MAX_MESSAGES = 100000;

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(messageData: Partial<Message>[]): Promise<void> {
    const res = await this.messageModel.insertMany(messageData, {
      rawResult: true,
    });

    console.log(`Imported ${res.insertedCount} messages`, res.insertedCount)
  }

  async archiveOldMessages(): Promise<void> {
    try {
      const count: number = await this.messageModel.countDocuments();

      if (count > MessagesService.MAX_MESSAGES) {
        const excess: number = count - MessagesService.MAX_MESSAGES;

        const oldMessages: MessageDocument[] = await this.messageModel
          .find({})
          .sort({ createdAt: 1 })
          .limit(excess)
          .lean();

        if (oldMessages.length > 0) {
          const archiveCollectionName = `archive.${this.messageModel.collection.name}`;

          // Get model for archiving
          const ArchiveMessageModel: Model<MessageDocument> = this.messageModel.db.model<MessageDocument>(
            'ArchiveMessage',
            this.messageModel.schema,
            archiveCollectionName,
          );

          await ArchiveMessageModel.insertMany(oldMessages);

          const idsToRemove: Types.ObjectId[] = oldMessages.map((msg) => msg._id as Types.ObjectId);
          await this.messageModel.deleteMany({ _id: { $in: idsToRemove } });

          console.log(`Archived ${oldMessages.length} messages into collection ${archiveCollectionName}.`,);
        }
      }
    } catch (error) {
      console.error(`Error on archiving messages:`, error);
      throw error;
    }
  }
}
