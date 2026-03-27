const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT e.slug, t.id, t.sortOrder, t.timeLabel, t.title, t.description
    FROM TimelineItem t
    JOIN Event e ON e.id = t.eventId
    WHERE e.slug = 'huitu-fest-2026'
    ORDER BY t.sortOrder ASC, t.id ASC
  `);

  console.log('rows=', rows.length);
  rows.forEach((r, idx) => {
    console.log(
      `${idx + 1}. id=${r.id}, sort=${r.sortOrder}, time='${r.timeLabel}', title='${r.title}', desc='${r.description}'`,
    );
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
