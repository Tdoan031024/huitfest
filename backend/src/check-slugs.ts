import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const events = await prisma.event.findMany({
    select: { id: true, slug: true, title: true }
  });
  console.log(JSON.stringify(events, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
