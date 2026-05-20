import { Controller, Get, Param } from '@nestjs/common';

import { EmployeesService } from './employees.service';
import { BalancesService } from '../balances/balances.service';

@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly balancesService: BalancesService,
  ) {}

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.employeesService.findById(id);
  }

  @Get(':id/balances')
  async getBalances(@Param('id') id: string) {
    await this.employeesService.findById(id);

    return this.balancesService.getEmployeeBalances(id);
  }
}
