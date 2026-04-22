const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.event.count();
  console.log('Current event count:', count);

  if (count === 0) {
    console.log('No event found. Seeding a default event...');
    await prisma.event.create({
      data: {
        slug: 'huitu-fest-2026',
        title: 'HUITU Fest 2026',
        subtitle: 'Đêm nhạc bùng nổ nhất tháng 3',
        description: 'Với sự góp mặt của hàng loạt nghệ sĩ hàng đầu, HUITU Fest 2026 hứa hẹn sẽ là đêm nhạc không thể nào quên dành riêng cho các bạn sinh viên HUIT.',
        startAt: new Date('2026-03-22T08:30:00.000Z'),
        registrationOpen: true,
        updatedAt: new Date(),
      }
    });
    console.log('Default event seeded.');
  } else {
    const events = await prisma.event.findMany();
    console.log('Events in DB:', JSON.stringify(events, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
