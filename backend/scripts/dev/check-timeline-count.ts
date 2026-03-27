import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const count = await prisma.timelineItem.count({
    where: { eventId: 1 }
  });
  console.log('Count for event 1:', count);
  await prisma.$disconnect();
}

main().catch(console.error);
