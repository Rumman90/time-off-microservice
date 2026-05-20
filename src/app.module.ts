import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { webcrypto } from 'crypto';
import 'dotenv/config';

import { SeedModule } from './seed/seed.module';
import { EmployeesModule } from './employees/employees.module';
import { AuditModule } from './audit/audit.module';
import { EventsModule } from './events/events.module';
import { MockHcmModule } from './mock-hcm/mock-hcm.module';
import { OutboxModule } from './outbox/outbox.module';
import { TimeOffRequestsModule } from './time-off-requests/time-off-requests.module';
import { HcmSyncModule } from './hcm-sync/hcm-sync.module';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
  });
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: process.env.DATABASE_PATH || 'database.sqlite',
        autoLoadEntities: true,
        synchronize: true,
        logging: false,
      }),
    }),
    SeedModule,
    EmployeesModule,
    AuditModule,
    EventsModule,
    MockHcmModule,
    OutboxModule,
    TimeOffRequestsModule,
    HcmSyncModule,
  ],
})
export class AppModule {}
