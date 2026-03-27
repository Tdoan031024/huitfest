import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const timelineItems = await prisma.timelineItem.findMany({
    where: { eventId: 1 },
    orderBy: { sortOrder: 'asc' }
  });
  console.log(JSON.stringify(timelineItems, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
