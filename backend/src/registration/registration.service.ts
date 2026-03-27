import { ConflictException, Injectable } from '@nestjs/common';

import { EventService } from '../event/event.service';
import { PrismaService } from '../prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  async create(payload: CreateRegistrationDto) {
    const event = await this.eventService.getCurrentEvent();

    if (!event.registrationOpen) {
      throw new ConflictException('Registration is closed for this event');
    }

    const email = payload.email.toLowerCase().trim();
    const phone = payload.phone.replace(/\s+/g, '').trim();

    const duplicated = await this.prisma.registration.findFirst({
      where: {
        eventId: event.id,
        OR: [{ email }, { phone }],
      },
    });

    if (duplicated) {
      throw new ConflictException('Email or phone already registered for this event');
    }

    return this.prisma.registration.create({
      data: {
        eventId: event.id,
        fullName: payload.fullName.trim(),
        email,
        phone,
        school: payload.school?.trim(),
        province: payload.province?.trim(),
        role: payload.role?.trim(),
        major: payload.major?.trim(),
        campus: payload.campus?.trim(),
        updatedAt: new Date(),
      },
    });
  }

  async getStats() {
    const event = await this.eventService.getCurrentEvent();
    const total = await this.prisma.registration.count({
      where: { eventId: event.id },
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      totalRegistrations: total,
      registrationOpen: event.registrationOpen,
    };
  }
}
