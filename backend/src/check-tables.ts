import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  try {
    const s = await (prisma as any).sponsor.count();
    const r = await (prisma as any).ruleItem.count();
    console.log('Tables exist and are empty:', s, r);
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  await prisma.$disconnect();
}
main();
