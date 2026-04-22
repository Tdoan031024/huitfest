const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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

  await prisma.aboutsection.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      title: 'VỀ HUIT FEST',
      content: 'HUIT Fest là sự kiện âm nhạc - công nghệ thường niên dành cho sinh viên...',
    },
  });

  console.log('Successfully seeded settings and about section');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
