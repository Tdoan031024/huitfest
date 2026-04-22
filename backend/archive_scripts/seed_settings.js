const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.sitesettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: 'HUIT Fest 2026',
      siteLogo: '/assets/images/logo/logohuit_avt.jpg',
      siteDescription: 'HUIT Fest 2026 là sự kiện âm nhạc bùng nổ dành cho sinh viên HUIT.',
    },
  });
  console.log('Site settings initialized:', settings);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
