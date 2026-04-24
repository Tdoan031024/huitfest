import { Controller, Get, Post, Body } from '@nestjs/common';
import { BannerService } from './banner.service';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  async findAll() {
    return this.bannerService.findAll();
  }

  @Post()
  async updateAll(@Body() banners: any[]) {
    try {
      return await this.bannerService.updateAll(banners);
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        stack: error.stack,
      };
    }
  }
}
