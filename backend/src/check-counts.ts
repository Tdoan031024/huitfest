import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const timelineItemCount = await prisma.timelineItem.count({ where: { eventId: 1 } });
  const journeyItemCount = await prisma.journeyItem.count({ where: { eventId: 1 } });
  console.log(`TimelineItem: ${timelineItemCount}`);
  console.log(`JourneyItem: ${journeyItemCount}`);
  await prisma.$disconnect();
}
main();
