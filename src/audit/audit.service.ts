import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: {
    entityType: string;
    entityId: string;
    action: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const log = this.auditLogRepository.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldStatus: params.oldStatus || null,
      newStatus: params.newStatus || null,
      message: params.message || null,
      metadata: params.metadata || {},
    });

    return this.auditLogRepository.save(log);
  }

  findAll() {
    return this.auditLogRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  findByEntity(entityType: string, entityId: string) {
    return this.auditLogRepository.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
