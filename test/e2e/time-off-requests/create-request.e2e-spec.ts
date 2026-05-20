/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';
import { OutboxWorker } from '../../../src/outbox/outbox.worker';

describe('Create Time-Off Request E2E', () => {
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

  it('rejects missing required fields', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({})
      .expect(400);
  });

  it('rejects invalid employee', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({
        employeeId: 'invalid-id',
        locationId: 'PK-KHI',
        leaveType: 'ANNUAL',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        requestedDays: 2,
      })
      .expect(404);
  });

  it('creates request as VALIDATION_PENDING and worker moves it to PENDING', async () => {
    const createRes = await request(app.getHttpAdapter().getInstance())
      .post('/time-off-requests')
      .send({
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        requestedDays: 2,
        reason: 'Family event',
      })
      .expect(201);

    expect(createRes.body.status).toBe('VALIDATION_PENDING');

    await outboxWorker.processPendingJobs();

    const getRes = await request(app.getHttpAdapter().getInstance())
      .get(`/time-off-requests/${createRes.body.requestId}`)
      .expect(200);

    expect(getRes.body.status).toBe('PENDING');
  });

  it('lists requests with filters', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .get(`/time-off-requests?employeeId=${employee.id}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((item) => item.employeeId === employee.id)).toBe(
      true,
    );
  });
});
