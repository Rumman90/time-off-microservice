import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  OutboxJobType,
  RequestStatus,
} from '../common/constants/app.constants';

import { OutboxJob } from './entities/outbox-job.entity';
import { TimeOffRequest } from '../time-off-requests/entities/time-off-request.entity';
import { HcmSyncLog } from '../hcm-sync/entities/hcm-sync-log.entity';

import { OutboxService } from './outbox.service';
import { MockHcmService } from '../mock-hcm/mock-hcm.service';
import { BalancesService } from '../balances/balances.service';
import { AuditService } from '../audit/audit.service';
import { RequestEventsService } from '../events/request-events.service';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private isRunning = false;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly mockHcmService: MockHcmService,
    private readonly balancesService: BalancesService,
    private readonly auditService: AuditService,
    private readonly requestEventsService: RequestEventsService,

    @InjectRepository(TimeOffRequest)
    private readonly timeOffRequestRepository: Repository<TimeOffRequest>,

    @InjectRepository(HcmSyncLog)
    private readonly hcmSyncLogRepository: Repository<HcmSyncLog>,
  ) {}

  start() {
    const interval = Number(process.env.OUTBOX_POLL_INTERVAL_MS) || 3000;

    setInterval(() => {
      void this.processPendingJobs();
    }, interval);

    this.logger.log(`Outbox worker started with interval ${interval}ms`);
  }

  async processPendingJobs() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const jobs = await this.outboxService.getPendingJobs();

      for (const job of jobs) {
        await this.processJob(job);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processJob(job: OutboxJob) {
    try {
      await this.outboxService.markProcessing(job);

      if (job.jobType === OutboxJobType.VALIDATE_LEAVE_REQUEST) {
        await this.validateLeaveRequest(job);
      } else if (job.jobType === OutboxJobType.SYNC_APPROVED_LEAVE_TO_HCM) {
        await this.syncApprovedLeave(job);
      } else {
        throw new Error('Unknown job type');
      }

      await this.outboxService.markCompleted(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.outboxService.markFailed(job, message);

      this.logger.error(`Outbox job failed: ${job.id} - ${message}`);
    }
  }

  private async validateLeaveRequest(job: OutboxJob) {
    const request = await this.timeOffRequestRepository.findOne({
      where: { id: job.entityId },
    });

    if (!request) {
      throw new Error('Request not found for validation');
    }

    if (request.status !== RequestStatus.VALIDATION_PENDING) {
      return;
    }

    let hcmBalance: Awaited<ReturnType<MockHcmService['getBalance']>>;

    try {
      hcmBalance = await this.mockHcmService.getBalance({
        employeeId: request.employeeId,
        locationId: request.locationId,
        leaveType: request.leaveType,
      });
    } catch (error) {
      const message = this.getErrorMessage(error);

      await this.insertHcmSyncLog({
        request,
        operation: 'VALIDATE_BALANCE',
        status: 'FAILED',
        errorMessage: message,
      });

      await this.updateRequestStatus(
        request,
        RequestStatus.HCM_VALIDATION_FAILED,
        `HCM validation failed: ${message}`,
      );

      return;
    }

    await this.balancesService.upsertBalance({
      employeeId: request.employeeId,
      locationId: request.locationId,
      leaveType: request.leaveType,
      availableBalance: Number(hcmBalance.availableBalance),
      source: 'HCM_REALTIME',
    });

    await this.insertHcmSyncLog({
      request,
      operation: 'VALIDATE_BALANCE',
      status: 'SUCCESS',
      hcmResponse: hcmBalance,
    });

    if (Number(hcmBalance.availableBalance) < Number(request.requestedDays)) {
      await this.updateRequestStatus(
        request,
        RequestStatus.REJECTED,
        'Insufficient HCM balance',
      );

      return;
    }

    await this.updateRequestStatus(
      request,
      RequestStatus.PENDING,
      'HCM validation successful',
    );
  }

  private async syncApprovedLeave(job: OutboxJob) {
    const request = await this.timeOffRequestRepository.findOne({
      where: { id: job.entityId },
    });

    if (!request) {
      throw new Error('Request not found for HCM sync');
    }

    if (request.status !== RequestStatus.HCM_SYNC_PENDING) {
      return;
    }

    let hcmResult: Awaited<ReturnType<MockHcmService['deductLeave']>>;

    try {
      hcmResult = await this.mockHcmService.deductLeave({
        requestId: request.id,
        employeeId: request.employeeId,
        locationId: request.locationId,
        leaveType: request.leaveType,
        days: request.requestedDays,
        idempotencyKey: request.idempotencyKey,
      });
    } catch (error) {
      const message = this.getErrorMessage(error);

      await this.insertHcmSyncLog({
        request,
        operation: 'DEDUCT_LEAVE',
        status: 'FAILED',
        errorMessage: message,
      });

      await this.updateRequestStatus(
        request,
        RequestStatus.HCM_SYNC_FAILED,
        `HCM deduction failed: ${message}`,
      );

      return;
    }

    const oldStatus = request.status;

    request.status = RequestStatus.APPROVED;
    request.hcmReferenceId = hcmResult.hcmReferenceId;

    await this.timeOffRequestRepository.save(request);

    await this.balancesService.upsertBalance({
      employeeId: request.employeeId,
      locationId: request.locationId,
      leaveType: request.leaveType,
      availableBalance: Number(hcmResult.availableBalance),
      source: 'HCM_DEDUCTION',
    });

    await this.insertHcmSyncLog({
      request,
      operation: 'DEDUCT_LEAVE',
      status: 'SUCCESS',
      hcmResponse: hcmResult,
    });

    await this.auditService.log({
      entityType: 'TIME_OFF_REQUEST',
      entityId: request.id,
      action: 'HCM_DEDUCTION_SUCCESS',
      oldStatus,
      newStatus: RequestStatus.APPROVED,
      message: 'HCM deducted leave successfully.',
      metadata: hcmResult,
    });

    this.requestEventsService.publish({
      requestId: request.id,
      status: RequestStatus.APPROVED,
      message: 'Leave request approved and synced with HCM.',
    });
  }

  private async updateRequestStatus(
    request: TimeOffRequest,
    newStatus: RequestStatus,
    message: string,
  ) {
    const oldStatus = request.status;

    request.status = newStatus;

    await this.timeOffRequestRepository.save(request);

    await this.auditService.log({
      entityType: 'TIME_OFF_REQUEST',
      entityId: request.id,
      action: 'STATUS_CHANGED',
      oldStatus,
      newStatus,
      message,
    });

    this.requestEventsService.publish({
      requestId: request.id,
      status: newStatus,
      message,
    });
  }

  private async insertHcmSyncLog(params: {
    request: TimeOffRequest;
    operation: string;
    status: string;
    errorMessage?: string | null;
    hcmResponse?: Record<string, unknown>;
  }) {
    const log = this.hcmSyncLogRepository.create({
      requestId: params.request.id,
      employeeId: params.request.employeeId,
      locationId: params.request.locationId,
      leaveType: params.request.leaveType,
      operation: params.operation,
      status: params.status,
      errorMessage: params.errorMessage || null,
      hcmResponse: params.hcmResponse || {},
    });

    await this.hcmSyncLogRepository.save(log);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown HCM error';
  }
}
