import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LeaveBalance } from './entities/leave-balance.entity';

@Injectable()
export class BalancesService {
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly leaveBalanceRepository: Repository<LeaveBalance>,
  ) {}

  getEmployeeBalances(employeeId: string) {
    return this.leaveBalanceRepository.find({
      where: {
        employeeId,
      },
      order: {
        leaveType: 'ASC',
      },
    });
  }

  async getEmployeeBalance(params: {
    employeeId: string;
    locationId: string;
    leaveType: string;
  }) {
    const balance = await this.leaveBalanceRepository.findOne({
      where: {
        employeeId: params.employeeId,
        locationId: params.locationId,
        leaveType: params.leaveType,
      },
    });

    if (!balance) {
      throw new NotFoundException('Balance not found');
    }

    return balance;
  }

  async upsertBalance(params: {
    employeeId: string;
    locationId: string;
    leaveType: string;
    availableBalance: number;
    source?: string;
    sourceVersion?: string | null;
  }) {
    let balance = await this.leaveBalanceRepository.findOne({
      where: {
        employeeId: params.employeeId,
        locationId: params.locationId,
        leaveType: params.leaveType,
      },
    });

    if (!balance) {
      balance = this.leaveBalanceRepository.create({
        employeeId: params.employeeId,
        locationId: params.locationId,
        leaveType: params.leaveType,
      });
    }

    balance.availableBalance = params.availableBalance;
    balance.source = params.source || 'HCM_REALTIME';
    balance.sourceVersion = params.sourceVersion || null;
    balance.lastSyncedAt = new Date();

    return this.leaveBalanceRepository.save(balance);
  }
}
