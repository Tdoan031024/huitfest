import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING SPONSORS DATA ===\n');
  
  // Get all events
  const events = await prisma.event.findMany({
    select: { id: true, slug: true, title: true }
  });
  
  console.log(`Found ${events.length} event(s):\n`);
  
  for (const event of events) {
    console.log(`\n📍 Event: ${event.title} (slug: ${event.slug})`);
    
    // Get sponsors for this event
    const sponsors = await (prisma as any).sponsor.findMany({
      where: { eventId: event.id },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`   Found ${sponsors.length} sponsor(s):`);
    sponsors.forEach((sponsor: any, i: number) => {
      console.log(`   ${i + 1}. ${sponsor.name || '(no name)'}`);
      console.log(`      - imageUrl: ${sponsor.imageUrl || '(EMPTY!)'}`);
      console.log(`      - sortOrder: ${sponsor.sortOrder}`);
    });
    
    // Also check pageConfig.footer
    const eventWithConfig = await prisma.event.findUnique({
      where: { id: event.id },
      select: { pageConfig: true }
    });
    
    const pageConfig = eventWithConfig?.pageConfig as any;
    if (pageConfig?.footer?.logos) {
      console.log(`\n   📄 pageConfig.footer.logos has ${pageConfig.footer.logos.length} item(s):`);
      pageConfig.footer.logos.forEach((logo: any, i: number) => {
        console.log(`   ${i + 1}. ${logo.name || '(no name)'} - image: ${logo.image || '(EMPTY!)'}`);
      });
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
