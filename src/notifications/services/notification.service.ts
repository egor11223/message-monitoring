import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EEventName } from '../../common';
import { IAnomalyCalcResult } from '../../messages/interfaces';

@Injectable()
export class NotificationService {
  @OnEvent(EEventName.messageAnomalyAlert)
  sendAlert(data: IAnomalyCalcResult) {
    console.log('Alert!', data);
  }
}
