import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

async function main() {
  const prisma = new PrismaClient();
  const event = await prisma.event.findUnique({
    where: { id: 1 },
    select: { pageConfig: true }
  });
  
  if (event && event.pageConfig) {
    fs.writeFileSync('config-v4.json', JSON.stringify(event.pageConfig, null, 2), 'utf8');
    console.log('Saved to config-v4.json');
  } else {
    console.log('No config found');
  }
  
  await prisma.$disconnect();
}
main();
