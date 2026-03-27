import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { id: 1 },
    select: { updatedAt: true }
  });
  console.log(`Updated at: ${event?.updatedAt}`);
  await prisma.$disconnect();
}
main();
