/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';
import { OutboxWorker } from '../../../src/outbox/outbox.worker';

describe('Approve Time-Off Request E2E', () => {
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
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        requestedDays: 2,
      });

    requestId = createRes.body.requestId;
    await outboxWorker.processPendingJobs();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks wrong manager approval', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post(`/time-off-requests/${requestId}/approve`)
      .send({
        managerId: 'wrong-manager-id',
        comment: 'Approved',
      })
      .expect(403);
  });

  it('approves request and moves to HCM_SYNC_PENDING', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .post(`/time-off-requests/${requestId}/approve`)
      .send({
        managerId: employee.managerId,
        comment: 'Approved',
      })
      .expect(201);

    expect(res.body.status).toBe('HCM_SYNC_PENDING');
  });

  it('worker syncs approved request with HCM and moves to APPROVED', async () => {
    await outboxWorker.processPendingJobs();

    const res = await request(app.getHttpAdapter().getInstance())
      .get(`/time-off-requests/${requestId}`)
      .expect(200);

    expect(res.body.status).toBe('APPROVED');
    expect(res.body.hcmReferenceId).toBeDefined();
  });

  it('blocks duplicate approval after approved', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post(`/time-off-requests/${requestId}/approve`)
      .send({
        managerId: employee.managerId,
      })
      .expect(409);
  });
});
