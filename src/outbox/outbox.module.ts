import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';
import { OutboxJob } from './entities/outbox-job.entity';

import { TimeOffRequest } from '../time-off-requests/entities/time-off-request.entity';
import { HcmSyncLog } from '../hcm-sync/entities/hcm-sync-log.entity';

import { MockHcmModule } from '../mock-hcm/mock-hcm.module';
import { BalancesModule } from '../balances/balances.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxJob, TimeOffRequest, HcmSyncLog]),
    MockHcmModule,
    BalancesModule,
    AuditModule,
    EventsModule,
  ],
  providers: [OutboxService, OutboxWorker],
  exports: [OutboxService, OutboxWorker],
})
export class OutboxModule {}
