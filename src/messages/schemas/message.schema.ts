import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EMessagePlatform } from '../enums';
import { ITwitterAdditionalData } from '../../twitter/interfaces';

export type MessageDocument = Message & Document;

@Schema()
export class Message {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  text: string;

  @Prop()
  authorId?: string;

  @Prop()
  authorName?: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ 
    required: true,
    enum: EMessagePlatform,
  })
  platform: EMessagePlatform;

  @Prop({
    required: true,
  })
  key: string;

  @Prop({ type: Object })
  additionalData: ITwitterAdditionalData;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ platform: 1, createdAt: -1 });
MessageSchema.index({ id: 1 }, { unique: true });