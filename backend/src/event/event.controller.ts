import { Body, Controller, Get, Param, Patch, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

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
  getConfig(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'Surrogate-Control': 'no-store',
    });
    return this.eventService.getEventConfig(slug);
  }

  @Put(':slug/config')
  @UseGuards(AdminGuard)
  updateConfig(@Param('slug') slug: string, @Body() config: any) {
    return this.eventService.updateEventConfig(slug, config);
  }

  @Patch(':slug/toggle-registration')
  @UseGuards(AdminGuard)
  toggleRegistration(@Param('slug') slug: string, @Body('open') open: boolean) {
    return this.eventService.toggleRegistration(slug, open);
  }
}
