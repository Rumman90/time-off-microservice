import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeaveBalance } from './entities/leave-balance.entity';
import { BalancesService } from './balances.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveBalance])],
  providers: [BalancesService],
  exports: [BalancesService],
})
export class BalancesModule {}
