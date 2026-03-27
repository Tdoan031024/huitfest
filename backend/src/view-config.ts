import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { id: 1 },
    select: { pageConfig: true }
  });
  console.log(JSON.stringify(event, null, 2));
  await prisma.$disconnect();
}
main();
