const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function normalizeConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function extractTimelineItems(config) {
  if (!config || !config.timeline || !Array.isArray(config.timeline.items)) {
    return [];
  }

  return config.timeline.items
    .filter((item) => item && (item.time || item.title || item.description))
    .map((item) => ({
      time: String(item.time || ''),
      title: String(item.title || ''),
      description: String(item.description || ''),
    }));
}

async function main() {
  const dbNameRows = await prisma.$queryRawUnsafe('SELECT DATABASE() AS dbName');
  const dbName = dbNameRows[0]?.dbName;

  const tableRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS c
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'TimelineItem'`,
  );

  const tableExists = Number(tableRows[0]?.c || 0) > 0;
  console.log('db=', dbName, 'timeline_table_exists=', tableExists);

  if (!tableExists) {
    return;
  }

  const events = await prisma.event.findMany({ select: { id: true, pageConfig: true } });
  for (const event of events) {
    const existing = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) AS c FROM `TimelineItem` WHERE eventId = ?',
      event.id,
    );
    const existingCount = Number(existing[0]?.c || 0);
    if (existingCount > 0) {
      continue;
    }

    const config = normalizeConfig(event.pageConfig);
    const items = extractTimelineItems(config);

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      await prisma.$executeRawUnsafe(
        'INSERT INTO `TimelineItem` (`eventId`, `timeLabel`, `title`, `description`, `sortOrder`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))',
        event.id,
        item.time,
        item.title,
        item.description,
        i + 1,
      );
    }
  }

  const counts = await prisma.$queryRawUnsafe(
    'SELECT eventId, COUNT(*) AS c FROM `TimelineItem` GROUP BY eventId ORDER BY eventId ASC',
  );

  console.log('timeline_counts=', counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
