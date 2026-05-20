import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Employee } from '../employees/entities/employee.entity';
import { LeaveBalance } from '../balances/entities/leave-balance.entity';
import { HcmMockBalance } from '../mock-hcm/entities/hcm-mock-balance.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,

    @InjectRepository(LeaveBalance)
    private readonly leaveBalanceRepository: Repository<LeaveBalance>,

    @InjectRepository(HcmMockBalance)
    private readonly hcmMockBalanceRepository: Repository<HcmMockBalance>,
  ) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  private async seed() {
    const employeeCount = await this.employeeRepository.count();

    if (employeeCount > 0) {
      return;
    }

    const manager1Id = crypto.randomUUID();
    const manager2Id = crypto.randomUUID();

    const employee1 = this.employeeRepository.create({
      employeeCode: 'EMP-101',
      name: 'Rumman Hussain Siddiqui',
      managerId: manager1Id,
      locationId: 'PK-KHI',
    });

    const employee2 = this.employeeRepository.create({
      employeeCode: 'EMP-102',
      name: 'Syeda Arisha Hussain',
      managerId: manager1Id,
      locationId: 'PK-KHI',
    });

    const employee3 = this.employeeRepository.create({
      employeeCode: 'EMP-103',
      name: 'Muhammad Umar Siddiqui',
      managerId: manager2Id,
      locationId: 'PK-LHR',
    });

    const employees = await this.employeeRepository.save([
      employee1,
      employee2,
      employee3,
    ]);

    const balances = [
      this.leaveBalanceRepository.create({
        employeeId: employees[0].id,
        locationId: 'PK-KHI',
        leaveType: 'ANNUAL',
        availableBalance: 10,
        lastSyncedAt: new Date(),
        source: 'SEED',
      }),
      this.leaveBalanceRepository.create({
        employeeId: employees[0].id,
        locationId: 'PK-KHI',
        leaveType: 'SICK',
        availableBalance: 5,
        lastSyncedAt: new Date(),
        source: 'SEED',
      }),
      this.leaveBalanceRepository.create({
        employeeId: employees[1].id,
        locationId: 'PK-KHI',
        leaveType: 'ANNUAL',
        availableBalance: 8,
        lastSyncedAt: new Date(),
        source: 'SEED',
      }),
      this.leaveBalanceRepository.create({
        employeeId: employees[2].id,
        locationId: 'PK-LHR',
        leaveType: 'ANNUAL',
        availableBalance: 12,
        lastSyncedAt: new Date(),
        source: 'SEED',
      }),
    ];

    await this.leaveBalanceRepository.save(balances);

    const hcmBalances = [
      this.hcmMockBalanceRepository.create({
        employeeId: employees[0].id,
        locationId: 'PK-KHI',
        leaveType: 'ANNUAL',
        availableBalance: 10,
      }),
      this.hcmMockBalanceRepository.create({
        employeeId: employees[0].id,
        locationId: 'PK-KHI',
        leaveType: 'SICK',
        availableBalance: 5,
      }),
      this.hcmMockBalanceRepository.create({
        employeeId: employees[1].id,
        locationId: 'PK-KHI',
        leaveType: 'ANNUAL',
        availableBalance: 8,
      }),
      this.hcmMockBalanceRepository.create({
        employeeId: employees[2].id,
        locationId: 'PK-LHR',
        leaveType: 'ANNUAL',
        availableBalance: 12,
      }),
    ];

    await this.hcmMockBalanceRepository.save(hcmBalances);

    console.log('Seeded employees:', {
      employee1Id: employees[0].id,
      employee2Id: employees[1].id,
      employee3Id: employees[2].id,
      manager1Id,
      manager2Id,
    });
  }
}
