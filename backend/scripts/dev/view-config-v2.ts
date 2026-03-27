import { PrismaClient } from '@prisma/client';
import fs from 'fs';
async function main() {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { id: 1 },
    select: { pageConfig: true }
  });
  fs.writeFileSync('config-utf8.json', JSON.stringify(event, null, 2));
  await prisma.$disconnect();
}
main();
