/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';
import { OutboxWorker } from '../../../src/outbox/outbox.worker';

describe('Insufficient Balance E2E', () => {
  let app: INestApplication;
  let employee: any;
  let outboxWorker: OutboxWorker;

  beforeAll(async () => {
    resetTestDatabase();
    app = await createTestApp();
    outboxWorker = app.get(OutboxWorker);

    const employees = await request(app.getHttpAdapter().getInstance()).get(
      '/employees',
    );
    employee = employees.body[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects request when HCM balance is insufficient', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/mock-hcm/balance/change')
      .send({
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        availableBalance: 1,
      })
      .expect(201);

    const createRes = await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        requestedDays: 5,
      })
      .expect(201);

    await outboxWorker.processPendingJobs();

    const getRes = await request(app.getHttpAdapter().getInstance())
      .get(`/time-off-requests/${createRes.body.requestId}`)
      .expect(200);

    expect(getRes.body.status).toBe('REJECTED');
  });
});
