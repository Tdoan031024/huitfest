import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AdminGuard } from '../auth/admin.guard';

import { CreateRegistrationDto } from './dto/create-registration.dto';
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
}
