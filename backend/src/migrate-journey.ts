import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { id: 1 },
    select: { id: true, pageConfig: true }
  });

  if (!event || !event.pageConfig) {
    console.log('No event or pageConfig found.');
    return;
  }

  const config = event.pageConfig as any;
  if (config.journey && Array.isArray(config.journey.cards)) {
    const cards = config.journey.cards.filter((c: any) => c && (c.title || c.description || c.image));
    console.log(`Found ${cards.length} cards in JSON. Migrating to table...`);

    await prisma.journeyItem.deleteMany({ where: { eventId: 1 } });
    
    if (cards.length > 0) {
      await prisma.journeyItem.createMany({
        data: cards.map((item: any, idx: number) => ({
          eventId: 1,
          title: String(item.title ?? ''),
          description: String(item.description ?? ''),
          imageUrl: String(item.image ?? ''),
          sortOrder: idx + 1,
        })),
      });
      console.log('Migration successful.');
    } else {
      console.log('No valid cards to migrate.');
    }
  } else {
    console.log('No journey.cards found in JSON.');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
