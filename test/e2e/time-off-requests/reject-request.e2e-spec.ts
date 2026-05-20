/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';
import { OutboxWorker } from '../../../src/outbox/outbox.worker';

describe('Reject Time-Off Request E2E', () => {
  let app: INestApplication;
  let employee: any;
  let requestId: string;
  let outboxWorker: OutboxWorker;

  beforeAll(async () => {
    resetTestDatabase();
    app = await createTestApp();
    outboxWorker = app.get(OutboxWorker);

    const employees = await request(app.getHttpAdapter().getInstance()).get(
      '/employees',
    );
    employee = employees.body[1];

    const createRes = await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        requestedDays: 2,
      });

    requestId = createRes.body.requestId;
    await outboxWorker.processPendingJobs();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects pending request', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .post(`/time-off-requests/${requestId}/reject`)
      .send({
        managerId: employee.managerId,
        comment: 'Team coverage issue',
      })
      .expect(201);

    expect(res.body.status).toBe('REJECTED');
  });

  it('does not approve rejected request', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post(`/time-off-requests/${requestId}/approve`)
      .send({
        managerId: employee.managerId,
      })
      .expect(409);
  });
});
