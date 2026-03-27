import { Body, Controller, Post } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';

import { RegistrationService } from '../registration/registration.service';

type LegacyLeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  school?: string;
  province?: string;
  role?: string;
  major?: string;
  campus?: string;
};

@Controller('demo/v1')
export class DemoController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('lead')
  async createLead(@Body() payload: LegacyLeadPayload) {
    try {
      const created = await this.registrationService.create({
        fullName: payload.name?.trim() || '',
        email: payload.email?.trim() || '',
        phone: payload.phone?.trim() || '',
        school: payload.school?.trim(),
        province: payload.province?.trim(),
        role: payload.role?.trim(),
        major: payload.major?.trim(),
        campus: payload.campus?.trim(),
      });

      return {
        ok: true,
        code: `REG${String(created.id).padStart(6, '0')}`,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          ok: false,
          code: 'da_dang_ky',
          message: 'Số điện thoại hoặc email đã đăng ký cho sự kiện này.',
          data: {
            status: 400,
          },
        };
      }

      throw error;
    }
  }
}
