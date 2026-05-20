import { Body, Controller, Get, Param, Post, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequestStatus } from '../common/constants/app.constants';
import { RequestEventsService } from '../events/request-events.service';

import { TimeOffRequestsService } from './time-off-requests.service';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';

@Controller('time-off-requests')
export class TimeOffRequestsController {
  constructor(
    private readonly timeOffRequestsService: TimeOffRequestsService,
    private readonly requestEventsService: RequestEventsService,
  ) {}

  @Post()
  create(@Body() dto: CreateTimeOffRequestDto) {
    return this.timeOffRequestsService.create(dto);
  }

  @Get()
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('managerId') managerId?: string,
    @Query('status') status?: RequestStatus,
    @Query('locationId') locationId?: string,
    @Query('leaveType') leaveType?: string,
  ) {
    return this.timeOffRequestsService.findAll({
      employeeId,
      managerId,
      status,
      locationId,
      leaveType,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.timeOffRequestsService.findById(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ManagerDecisionDto) {
    return this.timeOffRequestsService.approve(id, dto);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: ManagerDecisionDto) {
    return this.timeOffRequestsService.reject(id, dto);
  }

  @Sse(':id/events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.requestEventsService.listen(id);
  }
}
