import { Injectable, BadRequestException } from '@nestjs/common';
import { join } from 'node:path';
import * as fs from 'node:fs';
import * as sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly publicPath = join(process.cwd(), '..', 'frontend', 'public');
  private readonly allowedFolders = new Set([
    'uploads',
    'assets/images/banner',
    'assets/images/khachmoi',
    'assets/images/timeline',
    'assets/images/hanhtrinh',
    'assets/images/logo',
    'assets/images/sponsors',
  ]);

  constructor() {
    this.ensureDir('uploads');
    this.ensureDir('assets/images/banner');
    this.ensureDir('assets/images/khachmoi');
    this.ensureDir('assets/images/timeline');
    this.ensureDir('assets/images/hanhtrinh');
    this.ensureDir('assets/images/logo');
    this.ensureDir('assets/images/sponsors');
  }

  private ensureDir(relativePath: string) {
    const targetDir = join(this.publicPath, relativePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  private resolveFolder(folder?: string) {
    const normalized = (folder || 'uploads').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!this.allowedFolders.has(normalized)) {
      throw new BadRequestException('Invalid upload folder');
    }
    return normalized;
  }

  async processImage(file: Express.Multer.File, folder?: string) {
    if (!file.mimetype.startsWith('image/')) {
       throw new BadRequestException('Only image files are allowed');
    }

    const targetFolder = this.resolveFolder(folder);
    this.ensureDir(targetFolder);

    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueId}.webp`;
    const outputPath = join(this.publicPath, targetFolder, filename);
    const isWebpInput = file.mimetype === 'image/webp' || /\.webp$/i.test(file.originalname || '');

    try {
      // Banner and other image uploads are persisted as optimized WebP files.
      // If input is not WebP, it will be converted automatically.
      await sharp(file.buffer)
        .webp({ quality: isWebpInput ? 82 : 78 })
        .toFile(outputPath);
      
      return {
        url: `/${targetFolder}/${filename}`,
        folder: targetFolder,
        originalName: file.originalname,
        mimeType: 'image/webp',
        size: fs.statSync(outputPath).size
      };
    } catch (error) {
       console.error('Image processing failed:', error);
       throw new BadRequestException('Failed to process image');
    }
  }
}
