import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeedService } from './seed.service';
import { Employee } from '../employees/entities/employee.entity';
import { LeaveBalance } from '../balances/entities/leave-balance.entity';
import { HcmMockBalance } from '../mock-hcm/entities/hcm-mock-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, LeaveBalance, HcmMockBalance])],
  providers: [SeedService],
})
export class SeedModule {}
