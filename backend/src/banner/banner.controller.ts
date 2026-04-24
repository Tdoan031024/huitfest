import { Controller, Get, Post, Body } from '@nestjs/common';
import { BannerService } from './banner.service';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) { }

  @Get()
  async findAll() {
    return this.bannerService.findAll();
  }

  @Post()
  async updateAll(@Body() banners: any[]) {
    return this.bannerService.updateAll(banners);
  }
}
