import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const slug = 'huitu-fest-2026';
  
  const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, pageConfig: true },
    });
    if (!event) return;

    const timelineItems = await prisma.timelineItem.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    const journeyItems = await prisma.journeyItem.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    const pageConfig = event.pageConfig && typeof event.pageConfig === 'object'
      ? (event.pageConfig as Record<string, any>)
      : {};

    // DB Items are the Source of Truth
    const finalTimeline = {
      ...(pageConfig.timeline || {}),
      items: timelineItems.map((item) => ({
        id: item.id,
        time: item.timeLabel,
        title: item.title,
        description: item.description,
      })),
    };

    const finalJourney = {
      ...(pageConfig.journey || {}),
      items: journeyItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        image: item.imageUrl,
      })),
    };

    const result = {
      ...pageConfig,
      timeline: finalTimeline,
      journey: finalJourney,
    };
  
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}
main();
