import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { MockHcmService } from './mock-hcm.service';
import { ChangeHcmBalanceDto } from './dto/change-hcm-balance.dto';
import { DeductLeaveDto } from './dto/deduct-leave.dto';

@Controller('mock-hcm')
export class MockHcmController {
  constructor(private readonly mockHcmService: MockHcmService) {}

  @Get('balance')
  getBalance(
    @Query('employeeId') employeeId: string,
    @Query('locationId') locationId: string,
    @Query('leaveType') leaveType: string,
  ) {
    return this.mockHcmService.getBalance({
      employeeId,
      locationId,
      leaveType,
    });
  }

  @Post('balance/change')
  changeBalance(@Body() dto: ChangeHcmBalanceDto) {
    return this.mockHcmService.changeBalance(dto);
  }

  @Post('deduct')
  deductLeave(@Body() dto: DeductLeaveDto) {
    return this.mockHcmService.deductLeave(dto);
  }
}
