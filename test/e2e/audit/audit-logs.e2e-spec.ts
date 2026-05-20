/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';
import { OutboxWorker } from '../../../src/outbox/outbox.worker';

describe('Audit Logs E2E', () => {
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
    employee = employees.body[0];

    const createRes = await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        requestedDays: 2,
      });

    requestId = createRes.body.requestId;
    await outboxWorker.processPendingJobs();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns audit logs', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .get('/audit-logs')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns audit logs by entity', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .get(`/audit-logs?entityType=TIME_OFF_REQUEST&entityId=${requestId}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
