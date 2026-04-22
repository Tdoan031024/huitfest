const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.adminuser.findUnique({
    where: { username: 'admin' }
  });
  
  if (admin) {
    console.log('--- ADMIN USER FOUND ---');
    console.log('Username:', admin.username);
    console.log('Is Active:', admin.isActive);
    console.log('Last Login:', admin.lastLoginAt);
    console.log('Password Hash starts with:', admin.passwordHash.substring(0, 10));
  } else {
    console.log('!!! ADMIN USER NOT FOUND IN DATABASE !!!');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
