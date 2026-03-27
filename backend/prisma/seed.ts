import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.upsert({
    where: { slug: 'huitu-fest-2026' },
    update: {
      title: 'HUITU Fest 2026',
      subtitle: 'Dem nhac lon nhat thang 3',
      description:
        'Landing page dong cho HUITU Fest 2026 voi du lieu duoc quan ly tu he thong.',
      startAt: new Date('2026-03-22T08:30:00.000Z'),
      endAt: new Date('2026-03-22T15:00:00.000Z'),
      registrationOpen: false,
      updatedAt: new Date(),
    },
    create: {
      slug: 'huitu-fest-2026',
      title: 'HUITU Fest 2026',
      subtitle: 'Dem nhac lon nhat thang 3',
      description:
        'Landing page dong cho HUITU Fest 2026 voi du lieu duoc quan ly tu he thong.',
      heroImage:
        '/w.ladicdn.com/s1100x950/6981a16d67d19e0012bf5d55/nui-ca-si-20260316083752-_dgqx.png',
      startAt: new Date('2026-03-22T08:30:00.000Z'),
      endAt: new Date('2026-03-22T15:00:00.000Z'),
      registrationOpen: false,
      updatedAt: new Date(),
    },
  });

  await prisma.artist.deleteMany({ where: { eventId: event.id } });
  await prisma.agendaitem.deleteMany({ where: { eventId: event.id } });

  await prisma.artist.createMany({
    data: [
      { eventId: event.id, name: 'Noo Phuoc Thinh', sortOrder: 1 },
      { eventId: event.id, name: 'Tang Duy Tan', sortOrder: 2 },
      { eventId: event.id, name: 'Orange', sortOrder: 3 },
      { eventId: event.id, name: 'MONO', sortOrder: 4 },
    ],
  });

  await prisma.agendaitem.createMany({
    data: [
      {
        eventId: event.id,
        title: 'Don khach va check-in',
        startTime: new Date('2026-03-22T08:30:00.000Z'),
        endTime: new Date('2026-03-22T10:00:00.000Z'),
        sortOrder: 1,
      },
      {
        eventId: event.id,
        title: 'Giao luu cung khan gia',
        startTime: new Date('2026-03-22T10:00:00.000Z'),
        endTime: new Date('2026-03-22T10:30:00.000Z'),
        sortOrder: 2,
      },
      {
        eventId: event.id,
        title: 'Chuong trinh nghe si khach moi',
        startTime: new Date('2026-03-22T11:10:00.000Z'),
        endTime: new Date('2026-03-22T13:00:00.000Z'),
        sortOrder: 3,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed done for event:', event.slug);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
