import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug = 'huit-fest-2026';
  const event = await prisma.event.findUnique({ where: { slug } });
  
  if (!event) {
    console.log('Event not found');
    return;
  }

  let config: any = {};
  try {
    config = typeof event.pageConfig === 'string' ? JSON.parse(event.pageConfig) : (event.pageConfig || {});
  } catch (e) {
    config = {};
  }

  if (config.about && config.about.heading === 'VẾ HUIT FEST') {
    config.about.heading = 'VỀ HUIT FEST';
    await prisma.event.update({
      where: { id: event.id },
      data: { pageConfig: JSON.stringify(config) }
    });
    console.log('Fixed heading in database from VẾ to VỀ');
  } else {
    console.log('Heading is already correct or not "VẾ HUIT FEST"');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
