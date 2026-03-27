import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const usernameArg = process.argv[2]?.trim();
  const passwordArg = process.argv[3];

  const username = usernameArg || process.env.ADMIN_SEED_USERNAME || '';
  const password = passwordArg || process.env.ADMIN_SEED_PASSWORD || '';

  if (!username || !password) {
    throw new Error(
      'Missing credentials. Use: npm run admin:create -- <username> <password> or set ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD.',
    );
  }

  const prisma = new PrismaClient();

  try {
    const passwordHash = await hash(password, 12);

    await prisma.adminuser.upsert({
      where: { username },
      update: {
        passwordHash,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        username,
        passwordHash,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    // eslint-disable-next-line no-console
    console.log(`Admin account '${username}' has been created/updated with hashed password.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
