import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const sponsors = await (prisma as any).sponsor.findMany();
  const rules = await (prisma as any).ruleItem.findMany();
  console.log('Sponsors:', JSON.stringify(sponsors, null, 2));
  console.log('Rules:', JSON.stringify(rules, null, 2));
  await prisma.$disconnect();
}
main();
