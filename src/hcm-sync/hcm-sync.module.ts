import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HcmSyncService } from './hcm-sync.service';
import { HcmSyncController } from './hcm-sync.controller';
import { HcmSyncLog } from './entities/hcm-sync-log.entity';

import { BalancesModule } from '../balances/balances.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HcmSyncLog]),
    BalancesModule,
    AuditModule,
  ],
  controllers: [HcmSyncController],
  providers: [HcmSyncService],
  exports: [HcmSyncService],
})
export class HcmSyncModule {}
