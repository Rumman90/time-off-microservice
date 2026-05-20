/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';
import { OutboxWorker } from '../../../src/outbox/outbox.worker';

describe('HCM Failure States E2E', () => {
  let app: INestApplication;
  let employee: any;
  let outboxWorker: OutboxWorker;

  beforeEach(async () => {
    resetTestDatabase();
    app = await createTestApp();
    outboxWorker = app.get(OutboxWorker);

    const employees = await request(app.getHttpAdapter().getInstance()).get(
      '/employees',
    );
    employee = employees.body[0];
  });

  afterEach(async () => {
    await app.close();
  });

  it('marks request as HCM_VALIDATION_FAILED when HCM dimensions are invalid', async () => {
    const createRes = await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({
        employeeId: employee.id,
        locationId: 'INVALID-LOCATION',
        leaveType: 'ANNUAL',
        startDate: '2026-10-01',
        endDate: '2026-10-02',
        requestedDays: 2,
      })
      .expect(201);

    await outboxWorker.processPendingJobs();

    const getRes = await request(app.getHttpAdapter().getInstance())
      .get(`/time-off-requests/${createRes.body.requestId}`)
      .expect(200);

    expect(getRes.body.status).toBe('HCM_VALIDATION_FAILED');

    const logs = await request(app.getHttpAdapter().getInstance())
      .get(
        `/audit-logs?entityType=TIME_OFF_REQUEST&entityId=${createRes.body.requestId}`,
      )
      .expect(200);

    expect(
      logs.body.some((log) => log.newStatus === 'HCM_VALIDATION_FAILED'),
    ).toBe(true);
  });

  it('marks approved request as HCM_SYNC_FAILED when HCM deduction rejects it', async () => {
    const createRes = await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        requestedDays: 5,
      })
      .expect(201);

    await outboxWorker.processPendingJobs();

    await request(app.getHttpAdapter().getInstance())
      .post('/mock-hcm/balance/change')
      .send({
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        availableBalance: 1,
      })
      .expect(201);

    await request(app.getHttpAdapter().getInstance())
      .post(`/time-off-requests/${createRes.body.requestId}/approve`)
      .send({
        managerId: employee.managerId,
      })
      .expect(201);

    await outboxWorker.processPendingJobs();

    const getRes = await request(app.getHttpAdapter().getInstance())
      .get(`/time-off-requests/${createRes.body.requestId}`)
      .expect(200);

    expect(getRes.body.status).toBe('HCM_SYNC_FAILED');
  });
});
