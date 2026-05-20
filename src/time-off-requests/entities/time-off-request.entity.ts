import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RequestStatus } from '../../common/constants/app.constants';

@Entity('time_off_requests')
@Index(['employeeId'])
@Index(['managerId'])
@Index(['status'])
export class TimeOffRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_code', unique: true })
  requestCode: string;

  @Column({ name: 'employee_id' })
  employeeId: string;

  @Column({ name: 'manager_id' })
  managerId: string;

  @Column({ name: 'location_id' })
  locationId: string;

  @Column({ name: 'leave_type' })
  leaveType: string;

  @Column({ name: 'start_date' })
  startDate: string;

  @Column({ name: 'end_date' })
  endDate: string;

  @Column({ name: 'requested_days', type: 'real' })
  requestedDays: number;

  @Column()
  status: RequestStatus;

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'manager_comment', nullable: true })
  managerComment: string;

  @Column({ name: 'hcm_reference_id', nullable: true })
  hcmReferenceId: string;

  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
