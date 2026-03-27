import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';

import { AdminGuard } from '../auth/admin.guard';

import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get('current')
  getCurrentEvent() {
    return this.eventService.getCurrentEvent();
  }

  @Get(':slug/config')
  getConfig(@Param('slug') slug: string) {
    return this.eventService.getEventConfig(slug);
  }

  @Put(':slug/config')
  // @UseGuards(AdminGuard)
  updateConfig(@Param('slug') slug: string, @Body() config: any) {
    return this.eventService.updateEventConfig(slug, config);
  }
}
