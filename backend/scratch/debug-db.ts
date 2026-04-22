import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.findFirst({
    orderBy: { startAt: 'desc' }
  });
  
  console.log('--- Current Event Data ---');
  console.log('Slug:', event?.slug);
  console.log('VideoUrl type:', typeof event?.videoUrl);
  console.log('VideoUrl length:', event?.videoUrl?.length);
  console.log('VideoUrl value:', event?.videoUrl);
  console.log('--------------------------');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
