import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  OutboxJobType,
  RequestStatus,
} from '../common/constants/app.constants';
import {
  createIdempotencyKey,
  createRequestCode,
} from '../common/utils/id.util';

import { TimeOffRequest } from './entities/time-off-request.entity';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';

import { EmployeesService } from '../employees/employees.service';
import { OutboxService } from '../outbox/outbox.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TimeOffRequestsService {
  constructor(
    @InjectRepository(TimeOffRequest)
    private readonly timeOffRequestRepository: Repository<TimeOffRequest>,

    private readonly employeesService: EmployeesService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTimeOffRequestDto) {
    const employee = await this.employeesService.findById(dto.employeeId);

    const request = this.timeOffRequestRepository.create({
      requestCode: createRequestCode(),
      employeeId: employee.id,
      managerId: employee.managerId,
      locationId: dto.locationId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      requestedDays: dto.requestedDays,
      status: RequestStatus.VALIDATION_PENDING,
      reason: dto.reason || null,
      idempotencyKey: '',
    });

    const savedRequest = await this.timeOffRequestRepository.save(request);

    savedRequest.idempotencyKey = createIdempotencyKey(savedRequest.id);

    await this.timeOffRequestRepository.save(savedRequest);

    await this.outboxService.createJob({
      jobType: OutboxJobType.VALIDATE_LEAVE_REQUEST,
      entityId: savedRequest.id,
      payload: {
        requestId: savedRequest.id,
      },
    });

    await this.auditService.log({
      entityType: 'TIME_OFF_REQUEST',
      entityId: savedRequest.id,
      action: 'REQUEST_CREATED',
      oldStatus: null,
      newStatus: RequestStatus.VALIDATION_PENDING,
      message: 'Leave request created and queued for HCM validation.',
      metadata: {
        requestCode: savedRequest.requestCode,
        employeeId: savedRequest.employeeId,
      },
    });

    return {
      requestId: savedRequest.id,
      requestCode: savedRequest.requestCode,
      status: savedRequest.status,
      message: 'Leave request received and queued for HCM validation.',
    };
  }

  findAll(filters: {
    employeeId?: string;
    managerId?: string;
    status?: RequestStatus;
    locationId?: string;
    leaveType?: string;
  }) {
    return this.timeOffRequestRepository.find({
      where: {
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.managerId ? { managerId: filters.managerId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.locationId ? { locationId: filters.locationId } : {}),
        ...(filters.leaveType ? { leaveType: filters.leaveType } : {}),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findById(id: string) {
    const request = await this.timeOffRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Time-off request not found');
    }

    return request;
  }

  async approve(id: string, dto: ManagerDecisionDto) {
    const request = await this.findById(id);

    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException(
        `Only ${RequestStatus.PENDING} requests can be approved. Current status is ${request.status}`,
      );
    }

    if (request.managerId !== dto.managerId) {
      throw new ForbiddenException(
        'Manager is not allowed to approve this request',
      );
    }

    const oldStatus = request.status;

    request.status = RequestStatus.HCM_SYNC_PENDING;
    request.managerComment = dto.comment || null;

    await this.timeOffRequestRepository.save(request);

    await this.outboxService.createJob({
      jobType: OutboxJobType.SYNC_APPROVED_LEAVE_TO_HCM,
      entityId: request.id,
      payload: {
        requestId: request.id,
      },
    });

    await this.auditService.log({
      entityType: 'TIME_OFF_REQUEST',
      entityId: request.id,
      action: 'APPROVAL_ACCEPTED',
      oldStatus,
      newStatus: RequestStatus.HCM_SYNC_PENDING,
      message: 'Manager approved request. HCM sync queued.',
      metadata: {
        managerId: dto.managerId,
      },
    });

    return {
      requestId: request.id,
      status: RequestStatus.HCM_SYNC_PENDING,
      message: 'Approval accepted and queued for HCM synchronization.',
    };
  }

  async reject(id: string, dto: ManagerDecisionDto) {
    const request = await this.findById(id);

    if (
      request.status !== RequestStatus.PENDING &&
      request.status !== RequestStatus.VALIDATION_PENDING
    ) {
      throw new ConflictException(
        `Only PENDING or VALIDATION_PENDING requests can be rejected. Current status is ${request.status}`,
      );
    }

    if (request.managerId !== dto.managerId) {
      throw new ForbiddenException(
        'Manager is not allowed to reject this request',
      );
    }

    const oldStatus = request.status;

    request.status = RequestStatus.REJECTED;
    request.managerComment = dto.comment || null;

    await this.timeOffRequestRepository.save(request);

    await this.auditService.log({
      entityType: 'TIME_OFF_REQUEST',
      entityId: request.id,
      action: 'REQUEST_REJECTED',
      oldStatus,
      newStatus: RequestStatus.REJECTED,
      message: 'Manager rejected request.',
      metadata: {
        managerId: dto.managerId,
      },
    });

    return {
      requestId: request.id,
      status: RequestStatus.REJECTED,
      message: 'Leave request rejected.',
    };
  }
}
