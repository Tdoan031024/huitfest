import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const slug = 'huitu-fest-2026';
  
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, pageConfig: true }
  });
  
  if (!event || !event.pageConfig) {
    console.log('Event or config not found');
    return;
  }
  
  const config = event.pageConfig as any;
  
  // 1. Migrate Sponsors
  if (config.footer && Array.isArray(config.footer.logos)) {
    console.log(`Migrating ${config.footer.logos.length} sponsors...`);
    await (prisma as any).sponsor.deleteMany({ where: { eventId: event.id } });
    await (prisma as any).sponsor.createMany({
      data: config.footer.logos.map((logo: any, idx: number) => ({
        eventId: event.id,
        name: logo.name || '',
        imageUrl: logo.image || '',
        sortOrder: idx + 1
      }))
    });
  }
  
  // 2. Migrate Rules
  if (config.rules && config.rules.content) {
    console.log('Migrating rules content...');
    await (prisma as any).ruleItem.deleteMany({ where: { eventId: event.id } });
    await (prisma as any).ruleItem.create({
      data: {
        eventId: event.id,
        title: '',
        content: config.rules.content,
        sortOrder: 1
      }
    });
  }
  
  console.log('Migration complete.');
  await prisma.$disconnect();
}
main();
