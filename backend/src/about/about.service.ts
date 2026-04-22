import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AboutService {
  constructor(private prisma: PrismaService) {}

  async getAbout() {
    let about = await this.prisma.aboutsection.findFirst({
      where: { id: 1 },
    });

    if (!about) {
      // Khởi tạo dữ liệu mặc định nếu chưa có
      about = await this.prisma.aboutsection.create({
        data: {
          id: 1,
          title: 'HUIT FEST 2026',
          content: 'Chào mừng bạn đến với sự kiện âm nhạc bùng nổ nhất năm tại HUIT.',
          imageUrl: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=2070&auto=format&fit=crop',
        },
      });
    }

    return about;
  }

  async updateAbout(data: any) {
    return this.prisma.aboutsection.upsert({
      where: { id: 1 },
      update: {
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
      },
      create: {
        id: 1,
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
      },
    });
  }
}
