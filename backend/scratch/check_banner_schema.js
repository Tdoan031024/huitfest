const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE banner`);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
