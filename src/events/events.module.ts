import { Module } from '@nestjs/common';

import { RequestEventsService } from './request-events.service';

@Module({
  providers: [RequestEventsService],
  exports: [RequestEventsService],
})
export class EventsModule {}
