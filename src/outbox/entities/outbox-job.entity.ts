import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  OutboxJobStatus,
  OutboxJobType,
} from '../../common/constants/app.constants';

@Entity('outbox_jobs')
@Index(['status', 'nextRunAt'])
export class OutboxJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_type' })
  jobType: OutboxJobType;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ type: 'simple-json' })
  payload: Record<string, unknown>;

  @Column({ default: OutboxJobStatus.PENDING })
  status: OutboxJobStatus;

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number;

  @Column({
    name: 'next_run_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  nextRunAt: Date;

  @Column({ name: 'last_error', nullable: true })
  lastError: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
