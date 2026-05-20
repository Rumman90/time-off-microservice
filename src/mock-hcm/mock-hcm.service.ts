import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { HcmMockBalance } from './entities/hcm-mock-balance.entity';
import { HcmProcessedRequest } from './entities/hcm-processed-request.entity';
import { ChangeHcmBalanceDto } from './dto/change-hcm-balance.dto';
import { DeductLeaveDto } from './dto/deduct-leave.dto';

export type HcmDeductLeaveResult = {
  hcmReferenceId: string;
  availableBalance: number;
  alreadyProcessed: boolean;
};

@Injectable()
export class MockHcmService {
  constructor(
    @InjectRepository(HcmMockBalance)
    private readonly hcmMockBalanceRepository: Repository<HcmMockBalance>,

    @InjectRepository(HcmProcessedRequest)
    private readonly hcmProcessedRequestRepository: Repository<HcmProcessedRequest>,
  ) {}

  async getBalance(params: {
    employeeId: string;
    locationId: string;
    leaveType: string;
  }) {
    const balance = await this.hcmMockBalanceRepository.findOne({
      where: {
        employeeId: params.employeeId,
        locationId: params.locationId,
        leaveType: params.leaveType,
      },
    });

    if (!balance) {
      throw new BadRequestException('Invalid HCM balance dimensions');
    }

    return {
      employeeId: balance.employeeId,
      locationId: balance.locationId,
      leaveType: balance.leaveType,
      availableBalance: balance.availableBalance,
    };
  }

  async changeBalance(dto: ChangeHcmBalanceDto) {
    let balance = await this.hcmMockBalanceRepository.findOne({
      where: {
        employeeId: dto.employeeId,
        locationId: dto.locationId,
        leaveType: dto.leaveType,
      },
    });

    if (!balance) {
      balance = this.hcmMockBalanceRepository.create({
        employeeId: dto.employeeId,
        locationId: dto.locationId,
        leaveType: dto.leaveType,
      });
    }

    balance.availableBalance = dto.availableBalance;

    const saved = await this.hcmMockBalanceRepository.save(balance);

    return {
      employeeId: saved.employeeId,
      locationId: saved.locationId,
      leaveType: saved.leaveType,
      availableBalance: saved.availableBalance,
    };
  }

  async deductLeave(dto: DeductLeaveDto): Promise<HcmDeductLeaveResult> {
    const alreadyProcessed = await this.hcmProcessedRequestRepository.findOne({
      where: {
        idempotencyKey: dto.idempotencyKey,
      },
    });

    if (alreadyProcessed) {
      const response = alreadyProcessed.response as {
        hcmReferenceId: string;
        availableBalance: number;
      };

      return {
        hcmReferenceId: response.hcmReferenceId,
        availableBalance: response.availableBalance,
        alreadyProcessed: true,
      };
    }

    const balance = await this.hcmMockBalanceRepository.findOne({
      where: {
        employeeId: dto.employeeId,
        locationId: dto.locationId,
        leaveType: dto.leaveType,
      },
    });

    if (!balance) {
      throw new BadRequestException('Invalid HCM balance dimensions');
    }

    if (Number(balance.availableBalance) < Number(dto.days)) {
      throw new BadRequestException('Insufficient balance in HCM');
    }

    const newBalance = Number(balance.availableBalance) - Number(dto.days);
    const hcmReferenceId = randomUUID();

    const response = {
      hcmReferenceId,
      availableBalance: newBalance,
    };

    await this.hcmMockBalanceRepository.manager.transaction(async (manager) => {
      balance.availableBalance = newBalance;
      await manager.save(HcmMockBalance, balance);

      const processed = manager.create(HcmProcessedRequest, {
        idempotencyKey: dto.idempotencyKey,
        requestId: dto.requestId,
        employeeId: dto.employeeId,
        locationId: dto.locationId,
        leaveType: dto.leaveType,
        days: dto.days,
        hcmReferenceId,
        response,
      });

      await manager.save(HcmProcessedRequest, processed);
    });

    return {
      hcmReferenceId,
      availableBalance: newBalance,
      alreadyProcessed: false,
    };
  }
}
