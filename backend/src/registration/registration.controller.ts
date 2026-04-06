import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { AdminGuard } from '../auth/admin.guard';

import { AdminRegistrationQueryDto } from './dto/admin-registration-query.dto';
import { BulkUpdateAdminRegistrationDto } from './dto/bulk-update-admin-registration.dto';
import { CheckinTicketDto } from './dto/checkin-ticket.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateAdminRegistrationDto } from './dto/update-admin-registration.dto';
import { VerifyTicketDto } from './dto/verify-ticket.dto';
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

  @Get('admin/:id/preview-ticket-email')
  @UseGuards(AdminGuard)
  async previewAdminTicketEmail(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const preview = await this.registrationService.previewTicketEmailForAdmin(id);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(preview.html);
  }

  @Get('admin/:id/preview-ticket-pdf')
  @UseGuards(AdminGuard)
  async previewAdminTicketPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const file = await this.registrationService.previewTicketPdfForAdmin(id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
    response.send(file.buffer);
  }

  @Post('admin/tickets/verify')
  @UseGuards(AdminGuard)
  verifyAdminTicket(@Body() payload: VerifyTicketDto) {
    return this.registrationService.verifyTicketForAdmin(payload);
  }

  @Post('admin/tickets/checkin')
  @UseGuards(AdminGuard)
  checkinAdminTicket(@Body() payload: CheckinTicketDto) {
    return this.registrationService.checkInTicketForAdmin(payload);
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
