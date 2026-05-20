import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable()
export class RequestEventsService {
  private readonly subject = new Subject<{
    requestId: string;
    status: string;
    message: string;
    emittedAt?: string;
  }>();

  publish(event: { requestId: string; status: string; message: string }): void {
    this.subject.next({
      ...event,
      emittedAt: new Date().toISOString(),
    });
  }

  listen(requestId: string): Observable<MessageEvent> {
    return this.subject.asObservable().pipe(
      filter((event) => event.requestId === requestId),
      map(
        (event) =>
          ({
            data: event,
          }) as MessageEvent,
      ),
    );
  }
}
