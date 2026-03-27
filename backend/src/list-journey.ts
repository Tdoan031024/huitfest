import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const items = await prisma.journeyItem.findMany({
    where: { eventId: 1 }
  });
  console.log(JSON.stringify(items, null, 2));
  await prisma.$disconnect();
}
main();
