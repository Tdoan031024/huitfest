const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const admins = await prisma.adminuser.findMany({
      select: {
        username: true,
        isActive: true,
      }
    });
    console.log(JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
