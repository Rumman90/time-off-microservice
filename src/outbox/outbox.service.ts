import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, In, Repository } from 'typeorm';

import { OutboxJob } from './entities/outbox-job.entity';
import {
  OutboxJobStatus,
  OutboxJobType,
} from '../common/constants/app.constants';

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxJob)
    private readonly outboxJobRepository: Repository<OutboxJob>,
  ) {}

  async createJob(params: {
    jobType: OutboxJobType;
    entityId: string;
    payload: Record<string, unknown>;
  }) {
    const job = this.outboxJobRepository.create({
      jobType: params.jobType,
      entityId: params.entityId,
      payload: params.payload,
      status: OutboxJobStatus.PENDING,
      attemptCount: 0,
      nextRunAt: new Date(),
    });

    return this.outboxJobRepository.save(job);
  }

  getPendingJobs(limit = Number(process.env.OUTBOX_BATCH_SIZE) || 10) {
    return this.outboxJobRepository.find({
      where: {
        status: In([OutboxJobStatus.PENDING, OutboxJobStatus.FAILED]),
        nextRunAt: LessThanOrEqual(new Date()),
      },
      order: {
        createdAt: 'ASC',
      },
      take: limit,
    });
  }

  async markProcessing(job: OutboxJob) {
    job.status = OutboxJobStatus.PROCESSING;
    return this.outboxJobRepository.save(job);
  }

  async markCompleted(job: OutboxJob) {
    job.status = OutboxJobStatus.COMPLETED;
    return this.outboxJobRepository.save(job);
  }

  async markFailed(job: OutboxJob, errorMessage: string) {
    const nextAttemptCount = Number(job.attemptCount) + 1;
    const maxAttempts = 3;

    if (nextAttemptCount >= maxAttempts) {
      job.status = OutboxJobStatus.DEAD_LETTER;
      job.attemptCount = nextAttemptCount;
      job.lastError = errorMessage;

      return this.outboxJobRepository.save(job);
    }

    const delayMinutes = nextAttemptCount * 2;

    job.status = OutboxJobStatus.FAILED;
    job.attemptCount = nextAttemptCount;
    job.lastError = errorMessage;
    job.nextRunAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    return this.outboxJobRepository.save(job);
  }
}
