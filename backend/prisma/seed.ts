import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 0. Seed Admin User
  const adminUsername = 'admin';
  const adminPassword = 'admin123';
  const adminPasswordHash = await hash(adminPassword, 12);

  await prisma.adminuser.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: adminPasswordHash,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  console.log(`Seeded admin user: ${adminUsername}`);

  const event = await prisma.event.upsert({
    where: { slug: 'huitu-fest-2026' },
    update: {
      title: 'HUITU Fest 2026',
      subtitle: 'Đêm nhạc bùng nổ nhất tháng 3',
      description:
        'Với sự góp mặt của hàng loạt nghệ sĩ hàng đầu, HUITU Fest 2026 hứa hẹn sẽ là đêm nhạc không thể nào quên dành riêng cho các bạn sinh viên HUIT.',
      startAt: new Date('2026-03-22T08:30:00.000Z'),
      endAt: new Date('2026-03-22T15:00:00.000Z'),
      registrationOpen: true,
      updatedAt: new Date(),
    },
    create: {
      slug: 'huitu-fest-2026',
      title: 'HUITU Fest 2026',
      subtitle: 'Đêm nhạc bùng nổ nhất tháng 3',
      description:
        'Với sự góp mặt của hàng loạt nghệ sĩ hàng đầu, HUITU Fest 2026 hứa hẹn sẽ là đêm nhạc không thể nào quên dành riêng cho các bạn sinh viên HUIT.',
      heroImage:
        '/assets/images/hero_image.png',
      startAt: new Date('2026-03-22T08:30:00.000Z'),
      endAt: new Date('2026-03-22T15:00:00.000Z'),
      registrationOpen: true,
      updatedAt: new Date(),
    },
  });

  // Clear old data
  await prisma.artist.deleteMany({ where: { eventId: event.id } });
  await prisma.timelineitem.deleteMany({ where: { eventId: event.id } });
  await prisma.talent.deleteMany({ where: { eventId: event.id } });
  await prisma.instruction.deleteMany({ where: { eventId: event.id } });
  await prisma.rule.deleteMany({ where: { eventId: event.id } });

  // 1. Artists
  await prisma.artist.createMany({
    data: [
      { eventId: event.id, name: 'Noo Phước Thịnh', imageUrl: '/assets/images/artists/noo.png', sortOrder: 1 },
      { eventId: event.id, name: 'Tăng Duy Tân', imageUrl: '/assets/images/artists/tangduytan.png', sortOrder: 2 },
      { eventId: event.id, name: 'Orange', imageUrl: '/assets/images/artists/orange.png', sortOrder: 3 },
      { eventId: event.id, name: 'MONO', imageUrl: '/assets/images/artists/mono.png', sortOrder: 4 },
    ],
  });

  // 2. Timeline
  await prisma.timelineitem.createMany({
    data: [
      {
        eventId: event.id,
        time: '14:00',
        title: 'ĐÓN KHÁCH & CHECK-IN',
        description: 'Cổng check-in fanzone mở cửa đón chào các bạn',
        sortOrder: 1,
      },
      {
        eventId: event.id,
        time: '17:00',
        title: 'GIAO LƯU KHÁN GIẢ',
        description: 'Các hoạt động mini-game nhận quà tại sân khấu chính',
        sortOrder: 2,
      },
      {
        eventId: event.id,
        time: '19:30',
        title: 'BÙNG NỔ CÙNG BLACKJACK',
        description: 'Bùng nổ cùng các nghệ sĩ hàng đầu Việt Nam',
        sortOrder: 3,
      },
    ],
  });

  // 3. Talents
  await prisma.talent.createMany({
    data: [
      {
        eventId: event.id,
        name: 'CLB Âm Nhạc HUIT',
        imageUrl: '/assets/images/talents/talent1.png',
        description: 'Nơi hội tụ những giọng ca vàng của sinh viên HUIT.',
        status: 'revealed',
        sortOrder: 1,
      },
      {
        eventId: event.id,
        name: 'CLB Nhảy Hiện Đại',
        imageUrl: '/assets/images/talents/talent2.png',
        description: 'Những bước nhảy sôi động và đầy nhiệt huyết.',
        status: 'revealed',
        sortOrder: 2,
      },
      {
        eventId: event.id,
        name: 'Nhóm Rap HUIT',
        imageUrl: '/assets/images/talents/talent3.png',
        description: 'Phong cách rap cực chất từ các rapper GenZ.',
        status: 'revealed',
        sortOrder: 3,
      },
      {
        eventId: event.id,
        name: 'CLB Acoustic',
        imageUrl: '/assets/images/talents/talent4.png',
        description: 'Những giai điệu sâu lắng bên tiếng đàn guitar.',
        status: 'revealed',
        sortOrder: 4,
      },
    ],
  });

  // 4. Instructions
  await prisma.instruction.createMany({
    data: [
      {
        eventId: event.id,
        title: 'Đăng ký vé trực tuyến',
        content: 'Truy cập vào trang chủ, nhấn nút "Đăng ký nhận vé" và điền đầy đủ thông tin cá nhân theo yêu cầu.',
        sortOrder: 1,
      },
      {
        eventId: event.id,
        title: 'Xác nhận qua Email',
        content: 'Sau khi đăng ký thành công, bạn sẽ nhận được một email xác nhận kèm mã QR cá nhân.',
        sortOrder: 2,
      },
      {
        eventId: event.id,
        title: 'Đổi vé tại sự kiện',
        content: 'Mang theo mã QR và thẻ sinh viên đến cổng check-in vào ngày sự kiện để nhận vòng tay fanzone.',
        sortOrder: 3,
      },
    ],
  });

  // 5. Rules
  await prisma.rule.createMany({
    data: [
      {
        eventId: event.id,
        title: 'QUY ĐỊNH CHUNG',
        content: '1. Mang theo thẻ sinh viên chính chủ.\n2. Không mang chất cấm, vật nhọn.\n3. Tuân thủ hướng dẫn của BTC.',
        sortOrder: 1,
      },
    ],
  });

  // 6. Journey
  await prisma.journeyitem.createMany({
    data: [
      {
        eventId: event.id,
        title: 'KHÔNG GIAN ÂM NHẠC HOÀNH TRÁNG',
        content: 'Không gian âm nhạc ngoài trời với sức nóng của mùa hè và nhiệt huyết tuổi trẻ!',
        imageUrl: '/assets/images/banner/hanhtrinfh14.jpg',
        sortOrder: 1,
      },
      {
        eventId: event.id,
        title: 'GẶP GỠ LOẠT IDOLS ĐÌNH ĐÁM',
        content: 'Cháy hết mình cùng dàn line-up xịn sò ngay tại sân khấu HUIT Fest: Noo Phước Thịnh, Tăng Duy Tân, MONO, Orange...',
        imageUrl: '/assets/images/banner/banner.png',
        sortOrder: 2,
      },
    ],
  });

  // Banners (Global)
  await prisma.banner.deleteMany({});
  await prisma.banner.createMany({
    data: [
      {
        imageUrl: '/assets/images/banner/banner1.jpg',
        title: 'HUIT FEST 2026',
        subtitle: 'Lễ hội âm nhạc bùng nổ nhất năm',
        linkUrl: '#',
        sortOrder: 1,
        isActive: true,
      },
      {
        imageUrl: '/assets/images/banner/banner2.jpg',
        title: 'ĐĂNG KÝ NGAY',
        subtitle: 'Nhận vé tham gia miễn phí dành cho sinh viên',
        linkUrl: '#',
        sortOrder: 2,
        isActive: true,
      },
    ],
  });

  // 7. Site Settings
  await prisma.sitesettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: 'HUIT Fest 2026',
      siteDescription: 'Lễ hội âm nhạc công nghệ lớn nhất dành cho sinh viên HUIT',
      siteLogo: '/assets/images/logo/logohuit.png',
      ticketEventName: 'HUIT FEST 2026',
      ticketEventDateTime: '2026-03-22 19:00',
      ticketEventLocation: 'Trường Đại học Công Thương TP.HCM',
      ticketSupportEmail: 'support@huit.edu.vn',
    },
  });

  // 8. About Section
  await prisma.aboutsection.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      title: 'VỀ HUIT FEST',
      content: 'HUIT Fest là sự kiện âm nhạc - công nghệ thường niên dành cho sinh viên...',
    },
  });

  console.log('Seed completed successfully for event HUITU Fest 2026 and global settings');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
