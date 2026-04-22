import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result: any = await prisma.$queryRaw`DESCRIBE event`;
  console.log('--- Event Table Structure ---');
  console.table(result);
  console.log('-----------------------------');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
