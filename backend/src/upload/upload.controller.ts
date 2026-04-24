import { 
  Body,
  Controller, 
  Post, 
  UploadedFile, 
  UseInterceptors, 
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AdminGuard } from '../auth/admin.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: any,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    try {
      return await this.uploadService.processImage(file, folder);
    } catch (error: any) {
      return {
        statusCode: 500,
        message: error.message,
        stack: error.stack,
        details: 'Kiểm tra xem thư mục frontend/public có quyền ghi (write permission) không.'
      };
    }
  }
}
