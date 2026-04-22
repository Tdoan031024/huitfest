const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const username = 'HuitMedia';
  const password = 'Huit@media123';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminuser.upsert({
    where: { username: username },
    update: {
      passwordHash: passwordHash,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      username: username,
      passwordHash: passwordHash,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  console.log(`Successfully created/updated admin account: ${username}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
