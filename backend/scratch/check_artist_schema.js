const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE artist`);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log("Table artist might not exist or error:", e.message);
  }
}

main().finally(() => prisma.$disconnect());
