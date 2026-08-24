import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DlqChangeEvent {
  ticketId: string;
  action: 'added' | 'reprocessed' | 'deleted';
  timestamp: string;
}

@Controller()
export class DlqEventsController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('events/dlq/stream')
  sendDlqEvents(): Observable<{ type: string; data: DlqChangeEvent }> {
    return new Observable((subscriber) => {
      const handler = (event: DlqChangeEvent) => {
        subscriber.next({
          type: 'dlq.change',
          data: event,
        });
      };

      this.eventEmitter.on('dlq.change', handler);

      return () => {
        this.eventEmitter.off('dlq.change', handler);
      };
    });
  }
}
