const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.findUnique({ where: { slug: 'huitu-fest-2026' } });
  if (!event) {
    console.error('Event not found. Run check_event.js first.');
    return;
  }

  // 1. Artists
  const artistCount = await prisma.artist.count({ where: { eventId: event.id } });
  if (artistCount === 0) {
    await prisma.artist.createMany({
      data: [
        { eventId: event.id, name: 'Noo Phước Thịnh', imageUrl: '/assets/images/artists/noo.png', sortOrder: 1, description: 'Nghệ sĩ hạng A' },
        { eventId: event.id, name: 'Tăng Duy Tân', imageUrl: '/assets/images/artists/tangduytan.png', sortOrder: 2, description: 'Nghệ sĩ trẻ' },
      ],
    });
    console.log('Seeded artists');
  }

  // 2. Banners
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        { imageUrl: '/assets/images/banner/banner1.jpg', title: 'HUIT FEST 2026', subtitle: 'Lễ hội âm nhạc bùng nổ nhất năm', isActive: true },
      ],
    });
    console.log('Seeded banners');
  }

  // 3. Sitesettings (redundant but safe)
  await prisma.sitesettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: 'HUIT Fest 2026',
      siteLogo: '/assets/images/logo/logohuit.png',
      ticketEventName: 'HUIT FEST 2026',
    },
  });

  console.log('Full data sync completed.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
