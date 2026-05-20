/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';

describe('HCM Batch Sync E2E', () => {
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

  it('updates local balance cache from HCM batch sync', async () => {
    const syncRes = await request(app.getHttpAdapter().getInstance())
      .post('/hcm/sync/batch')
      .send([
        {
          employeeId: employee.id,
          locationId: employee.locationId,
          leaveType: 'ANNUAL',
          availableBalance: 15,
          sourceVersion: 'test-batch',
        },
      ])
      .expect(201);

    expect(syncRes.body.status).toBe('COMPLETED');
    expect(syncRes.body.processed).toBe(1);

    const balanceRes = await request(app.getHttpAdapter().getInstance())
      .get(`/employees/${employee.id}/balances`)
      .expect(200);

    const annualBalance = balanceRes.body.find(
      (item) => item.leaveType === 'ANNUAL',
    );

    expect(annualBalance.availableBalance).toBe(15);
    expect(annualBalance.source).toBe('HCM_BATCH');
  });
});
