/// <reference types="jest" />
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../setup/test-app.factory';
import { resetTestDatabase } from '../../setup/test-database';

describe('Employees E2E', () => {
  let app: INestApplication;
  let employee: any;

  beforeAll(async () => {
    resetTestDatabase();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns seeded employees', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .get('/employees')
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    employee = res.body[0];

    expect(employee.id).toBeDefined();
    expect(employee.employeeCode).toBeDefined();
    expect(employee.managerId).toBeDefined();
  });

  it('returns employee by id', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .get(`/employees/${employee.id}`)
      .expect(200);

    expect(res.body.id).toBe(employee.id);
  });

  it('returns employee balances', async () => {
    const res = await request(app.getHttpAdapter().getInstance())
      .get(`/employees/${employee.id}/balances`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 404 for invalid employee', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/employees/invalid-id')
      .expect(404);
  });
});
