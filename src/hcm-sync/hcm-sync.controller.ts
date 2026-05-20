import { Body, Controller, Post } from '@nestjs/common';

import { HcmSyncService } from './hcm-sync.service';
import { HcmBatchSyncItemDto } from './dto/hcm-batch-sync.dto';

@Controller('hcm/sync')
export class HcmSyncController {
  constructor(private readonly hcmSyncService: HcmSyncService) {}

  @Post('batch')
  batchSync(@Body() dto: HcmBatchSyncItemDto[]) {
    return this.hcmSyncService.batchSync(dto);
  }
}
