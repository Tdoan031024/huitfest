const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  try {
    const updated = await prisma.adminuser.update({
      where: { username: 'admin' },
      data: {
        passwordHash: hash,
        isActive: true
      }
    });
    console.log('Successfully reset password for admin to: admin123');
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
