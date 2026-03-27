import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
async function main() {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { id: 1 },
    select: { pageConfig: true }
  });
  fs.writeFileSync('config-v3.json', JSON.stringify(event, null, 2));
  await prisma.$disconnect();
}
main();
