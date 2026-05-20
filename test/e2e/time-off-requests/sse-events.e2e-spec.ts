/// <reference types="jest" />
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';
import { RequestEventsService } from '../../../src/events/request-events.service';

describe('SSE Events', () => {
  let app: INestApplication;
  let requestEventsService: RequestEventsService;

  beforeAll(async () => {
    resetTestDatabase();
    app = await createTestApp();
    requestEventsService = app.get(RequestEventsService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('publishes request status event', (done) => {
    const requestId = 'sse-test-request';

    const subscription = requestEventsService
      .listen(requestId)
      .subscribe((event) => {
        expect(event.data.requestId).toBe(requestId);
        expect(event.data.status).toBe('PENDING');

        subscription.unsubscribe();
        done();
      });

    requestEventsService.publish({
      requestId,
      status: 'PENDING',
      message: 'Test SSE event',
    });
  });
});
