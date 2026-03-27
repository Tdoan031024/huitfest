import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/prisma.service';
import { EventService } from '../../src/event/event.service';

async function main() {
  const prisma = new PrismaService();
  const service = new EventService(prisma);
  const slug = 'huitu-fest-2026';
  
  // 1. Get current
  const config = await service.getEventConfig(slug);
  console.log(`Initial items in journey: ${config.journey.items.length}`);
  
  // 2. Add empty item
  config.journey.items.push({
    title: '',
    description: '',
    image: ''
  });
  
  // 3. Update
  await service.updateEventConfig(slug, config);
  console.log('Update done.');
  
  // 4. Verify
  const updated = await service.getEventConfig(slug);
  console.log(`Updated items in journey: ${updated.journey.items.length}`);
  console.log('Final data:', JSON.stringify(updated.journey.items, null, 2));
  
  await prisma.$disconnect();
}
main();
