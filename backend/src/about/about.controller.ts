import { Controller, Get, Post, Body } from '@nestjs/common';
import { AboutService } from './about.service';

@Controller('api/about')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  @Get()
  getAbout() {
    return this.aboutService.getAbout();
  }

  @Post()
  updateAbout(@Body() data: any) {
    return this.aboutService.updateAbout(data);
  }
}
