import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BannerService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.banner.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateAll(banners: any[]) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Xóa các banner cũ (có thể giữ lại logic filter nếu cần)
      await tx.banner.deleteMany({});

      // 2. Thêm danh sách banner mới
      if (banners && banners.length > 0) {
        await tx.banner.createMany({
          data: banners.map((b, idx) => ({
            imageUrl: b.imageUrl,
            title: b.title || '',
            showTitle: b.showTitle ?? true,
            subtitle: b.subtitle || '',
            showSubtitle: b.showSubtitle ?? true,
            linkUrl: b.linkUrl || '',
            showLink: b.showLink ?? true,
            sortOrder: b.sortOrder ?? (idx + 1),
            isActive: b.isActive ?? true,
            updatedAt: new Date(),
          })),
        });
      }

      return this.findAll();
    });
  }
}
