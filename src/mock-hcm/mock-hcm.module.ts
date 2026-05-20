import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MockHcmController } from './mock-hcm.controller';
import { MockHcmService } from './mock-hcm.service';
import { HcmMockBalance } from './entities/hcm-mock-balance.entity';
import { HcmProcessedRequest } from './entities/hcm-processed-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HcmMockBalance, HcmProcessedRequest])],
  controllers: [MockHcmController],
  providers: [MockHcmService],
  exports: [MockHcmService],
})
export class MockHcmModule {}
