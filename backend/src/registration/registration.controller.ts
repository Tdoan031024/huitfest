import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { AdminGuard } from '../auth/admin.guard';

import { AdminRegistrationQueryDto } from './dto/admin-registration-query.dto';
import { BulkUpdateAdminRegistrationDto } from './dto/bulk-update-admin-registration.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateAdminRegistrationDto } from './dto/update-admin-registration.dto';
import { RegistrationService } from './registration.service';

@Controller('registrations')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  create(@Body() payload: CreateRegistrationDto) {
    return this.registrationService.create(payload);
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  getStats() {
    return this.registrationService.getStats();
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  getAdminList(@Query() query: AdminRegistrationQueryDto) {
    return this.registrationService.listForAdmin(query);
  }

  @Get('admin/export')
  @UseGuards(AdminGuard)
  async exportAdmin(@Query() query: AdminRegistrationQueryDto, @Res() response: Response) {
    const file = await this.registrationService.exportForAdmin(query);
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    response.send(file.buffer);
  }

  @Get('admin/:id')
  @UseGuards(AdminGuard)
  getAdminDetail(@Param('id', ParseIntPipe) id: number) {
    return this.registrationService.getDetailForAdmin(id);
  }

  @Patch('admin/bulk')
  @UseGuards(AdminGuard)
  bulkUpdateAdminRegistration(@Body() payload: BulkUpdateAdminRegistrationDto) {
    return this.registrationService.bulkUpdateForAdmin(payload);
  }

  @Patch('admin/:id')
  @UseGuards(AdminGuard)
  updateAdminRegistration(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateAdminRegistrationDto,
  ) {
    return this.registrationService.updateForAdmin(id, payload);
  }

  @Post('admin/:id/send-ticket-email')
  @UseGuards(AdminGuard)
  sendAdminTicketEmail(@Param('id', ParseIntPipe) id: number) {
    return this.registrationService.sendTicketEmailForAdmin(id);
  }
}
