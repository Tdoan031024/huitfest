const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  await prisma.adminuser.update({
    where: { username: 'admin' },
    data: { 
      passwordHash: hash,
      isActive: true
    }
  });
  
  console.log('Admin password has been reset to: admin123');
  console.log('New hash starts with:', hash.substring(0, 10));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
