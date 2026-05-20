/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';

describe('Mock HCM Idempotency E2E', () => {
  let app: INestApplication;
  let employee: any;

  beforeAll(async () => {
    resetTestDatabase();
    app = await createTestApp();

    const employees = await request(app.getHttpAdapter().getInstance()).get(
      '/employees',
    );
    employee = employees.body[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('prevents duplicate deduction using idempotency key', async () => {
    const idempotencyKey = 'test-idempotency-key';

    const first = await request(app.getHttpAdapter().getInstance())
      .post('/mock-hcm/deduct')
      .send({
        requestId: 'manual-request-id',
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        days: 1,
        idempotencyKey,
      })
      .expect(201);

    const second = await request(app.getHttpAdapter().getInstance())
      .post('/mock-hcm/deduct')
      .send({
        requestId: 'manual-request-id',
        employeeId: employee.id,
        locationId: employee.locationId,
        leaveType: 'ANNUAL',
        days: 1,
        idempotencyKey,
      })
      .expect(201);

    expect(second.body.alreadyProcessed).toBe(true);
    expect(second.body.availableBalance).toBe(first.body.availableBalance);
  });
});
