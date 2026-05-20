import { Controller, Get, Query } from '@nestjs/common';

import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    if (entityType && entityId) {
      return this.auditService.findByEntity(entityType, entityId);
    }

    return this.auditService.findAll();
  }
}
