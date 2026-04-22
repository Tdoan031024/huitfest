import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.sitesettings.findUnique({
      where: { id: 1 },
    });
  }

  async updateSettings(data: any) {
    return this.prisma.sitesettings.update({
      where: { id: 1 },
      data,
    });
  }
}
