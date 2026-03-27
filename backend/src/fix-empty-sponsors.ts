import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script để fix các sponsor có imageUrl rỗng hoặc null
 * Sẽ set một placeholder image hoặc xóa đi
 */
async function main() {
  console.log('=== FIX EMPTY SPONSOR IMAGES ===\n');
  
  const events = await prisma.event.findMany({
    select: { id: true, slug: true, title: true }
  });
  
  for (const event of events) {
    console.log(`\n📍 Checking event: ${event.title} (${event.slug})`);
    
    // Find sponsors with empty/null imageUrl
    const emptySponsors = await (prisma as any).sponsor.findMany({
      where: { 
        eventId: event.id,
        OR: [
          { imageUrl: null },
          { imageUrl: '' }
        ]
      }
    });
    
    if (emptySponsors.length === 0) {
      console.log('   ✅ All sponsors have valid imageUrl');
      continue;
    }
    
    console.log(`   ⚠️  Found ${emptySponsors.length} sponsor(s) with empty imageUrl:`);
    emptySponsors.forEach((s: any) => {
      console.log(`      - ID ${s.id}: "${s.name || '(no name)'}"`);
    });
    
    // Ask what to do
    console.log('\n   Options:');
    console.log('   1. Delete these sponsors');
    console.log('   2. Set placeholder image (/assets/images/placeholder.png)');
    console.log('   3. Skip (do nothing)');
    
    // For automation, let's set placeholder
    const PLACEHOLDER = '/assets/images/logo/placeholder.png';
    
    console.log(`\n   → Setting placeholder image: ${PLACEHOLDER}`);
    
    for (const sponsor of emptySponsors) {
      await (prisma as any).sponsor.update({
        where: { id: sponsor.id },
        data: { imageUrl: PLACEHOLDER }
      });
      console.log(`      ✅ Updated sponsor #${sponsor.id}`);
    }
  }
  
  console.log('\n=== VERIFICATION ===\n');
  
  for (const event of events) {
    const allSponsors = await (prisma as any).sponsor.findMany({
      where: { eventId: event.id },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`\n${event.title}:`);
    console.log(`  Total sponsors: ${allSponsors.length}`);
    
    const withImage = allSponsors.filter((s: any) => s.imageUrl && s.imageUrl.trim() !== '');
    const withoutImage = allSponsors.filter((s: any) => !s.imageUrl || s.imageUrl.trim() === '');
    
    console.log(`  - With image: ${withImage.length}`);
    console.log(`  - Without image: ${withoutImage.length}`);
    
    if (withImage.length > 0) {
      console.log('\n  Sponsors with images:');
      withImage.forEach((s: any, i: number) => {
        console.log(`    ${i + 1}. ${s.name || '(no name)'} → ${s.imageUrl}`);
      });
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
