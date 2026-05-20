import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BalancesService } from '../balances/balances.service';
import { AuditService } from '../audit/audit.service';

import { HcmSyncLog } from './entities/hcm-sync-log.entity';
import { HcmBatchSyncItemDto } from './dto/hcm-batch-sync.dto';

@Injectable()
export class HcmSyncService {
  constructor(
    private readonly balancesService: BalancesService,
    private readonly auditService: AuditService,

    @InjectRepository(HcmSyncLog)
    private readonly hcmSyncLogRepository: Repository<HcmSyncLog>,
  ) {}

  async batchSync(items: HcmBatchSyncItemDto[]) {
    const results = [];

    for (const item of items) {
      const balance = await this.balancesService.upsertBalance({
        employeeId: item.employeeId,
        locationId: item.locationId,
        leaveType: item.leaveType,
        availableBalance: item.availableBalance,
        source: 'HCM_BATCH',
        sourceVersion: item.sourceVersion || null,
      });

      const log = this.hcmSyncLogRepository.create({
        requestId: null,
        employeeId: item.employeeId,
        locationId: item.locationId,
        leaveType: item.leaveType,
        operation: 'BATCH_SYNC',
        status: 'SUCCESS',
        hcmResponse: {
          employeeId: item.employeeId,
          locationId: item.locationId,
          leaveType: item.leaveType,
          availableBalance: item.availableBalance,
          sourceVersion: item.sourceVersion || null,
        },
      });

      await this.hcmSyncLogRepository.save(log);

      results.push(balance);
    }

    await this.auditService.log({
      entityType: 'HCM_BATCH_SYNC',
      entityId: 'BATCH',
      action: 'BATCH_SYNC_COMPLETED',
      message: 'HCM batch sync completed.',
      metadata: {
        processed: results.length,
      },
    });

    return {
      processed: results.length,
      status: 'COMPLETED',
      results,
    };
  }
}
