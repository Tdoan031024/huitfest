import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma.service';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeArtistItems(config: any): Array<{ name: string; imageUrl: string; status: string; description: string; hints: any[] }> {
    const section = config && config.artists && typeof config.artists === 'object' ? config.artists : null;
    const rawItems = section && Array.isArray(section.artists) ? section.artists : [];

    if (rawItems.length === 0) return [];

    return rawItems
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        name: String(item.name ?? ''),
        imageUrl: String(item.image ?? item.imageUrl ?? ''),
        status: String(item.status ?? 'revealed'),
        description: String(item.description ?? ''),
        hints: Array.isArray(item.hints) ? item.hints : [],
      }));
  }

  private normalizeArtistsExtraItems(config: any): Array<{ name: string; imageUrl: string; status: string; description: string; hints: any[] }> {
    const section = config && config.artistsExtra && typeof config.artistsExtra === 'object' ? config.artistsExtra : null;
    const rawItems = section && Array.isArray(section.artists) ? section.artists : [];

    if (rawItems.length === 0) return [];

    return rawItems
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        name: String(item.name ?? ''),
        imageUrl: String(item.image ?? item.imageUrl ?? ''),
        status: String(item.status ?? 'revealed'),
        description: String(item.description ?? ''),
        hints: Array.isArray(item.hints) ? item.hints : [],
      }));
  }

  private normalizeTimelineItems(config: any): Array<{ time: string; title: string; description: string }> {
    if (!config || !config.timeline || !Array.isArray(config.timeline.items)) {
      return [];
    }

    return config.timeline.items
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        time: String(item.time ?? item.timeLabel ?? ''),
        title: String(item.title ?? ''),
        description: String(item.description ?? ''),
      }));
  }

  private normalizeJourneyItems(config: any): Array<{ title: string; description: string; imageUrl: string }> {
    if (!config || !config.journey) return [];
    
    // Prefer 'cards' if non-empty, otherwise fall back to 'items'. 
    // This is because the UI seems to update 'cards' but might send back a stale 'items' array.
    const rawItems = Array.isArray(config.journey.cards) && config.journey.cards.length > 0
      ? config.journey.cards
      : (Array.isArray(config.journey.items) ? config.journey.items : []);

    if (rawItems.length === 0) return [];

    return rawItems
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        title: String(item.title ?? ''),
        description: String(item.description ?? ''),
        imageUrl: String(item.image ?? item.imageUrl ?? ''),
      }));
  }

  private normalizeSponsorItems(config: any): Array<{ name: string; imageUrl: string }> {
    if (!config || !config.footer) return [];
    
    // Support multiple aliases for logos list
    const rawItems = Array.isArray(config.footer.logos) ? config.footer.logos :
                   (Array.isArray(config.footer.items) ? config.footer.items :
                   (Array.isArray(config.footer.cards) ? config.footer.cards : []));

    if (rawItems.length === 0) return [];

    return rawItems
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        name: String(item.name ?? ''),
        imageUrl: String(item.image ?? item.imageUrl ?? ''),
      }));
  }

  private normalizeRuleItems(config: any): Array<{ title: string; content: string }> {
    if (!config || !config.rules) return [];
    
    // Support both single block content and structured items (handles both 'items' and 'cards' aliases)
    const rawItems = Array.isArray(config.rules.items) ? config.rules.items : 
                   (Array.isArray(config.rules.cards) ? config.rules.cards : null);

    if (rawItems) {
      return rawItems
        .filter((item: any) => item && typeof item === 'object')
        .map((item: any) => ({
          title: String(item.title ?? ''),
          content: String(item.content ?? ''),
        }));
    }
    
    // Check if config.rules has content property (even if empty string)
    if ('content' in config.rules) {
      // Use the section title (from input) as the first item's title in DB
      const sectionTitle = config.rules.sectionTitle || config.rules.title || '';
      return [{ 
        title: String(sectionTitle), 
        content: String(config.rules.content ?? '') 
      }];
    }
    
    return [];
  }

  async getCurrentEvent() {
    const now = new Date();
    const event = await this.prisma.event.findFirst({
      where: {
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        artist: { orderBy: { sortOrder: 'asc' } },
        agendaitem: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (event) {
      return event;
    }

    const latest = await this.prisma.event.findFirst({
      orderBy: { startAt: 'desc' },
      include: {
        artist: { orderBy: { sortOrder: 'asc' } },
        agendaitem: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!latest) {
      throw new NotFoundException('No event data found');
    }

    return latest;
  }

  async getEventConfig(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, pageConfig: true, registrationOpen: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const timelineItems = await (this.prisma as any).timelineitem.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    const journeyItems = await (this.prisma as any).journeyitem.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    const sponsorItems = await (this.prisma as any).sponsor.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    const ruleItems = await (this.prisma as any).ruleitem.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    const artistItems = await this.prisma.artist.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    let artistExtraItems: any[] = [];
    const prismaAny = this.prisma as any;
    if (prismaAny.artistextraitem && typeof prismaAny.artistextraitem.findMany === 'function') {
      artistExtraItems = await prismaAny.artistextraitem.findMany({
        where: { eventId: event.id },
        orderBy: [
          { sortOrder: 'asc' },
          { id: 'asc' }
        ]
      });
    } else {
      // Fallback when Prisma Client has not been regenerated yet.
      artistExtraItems = await this.prisma.$queryRawUnsafe(
        'SELECT id, eventId, name, imageUrl, description, status, sortOrder FROM `artistextraitem` WHERE eventId = ? ORDER BY sortOrder ASC, id ASC',
        event.id,
      ) as any[];
    }

    const pageConfig = event.pageConfig && typeof event.pageConfig === 'object'
      ? (event.pageConfig as Record<string, any>)
      : {};

    const pageArtists = Array.isArray(pageConfig?.artists?.artists)
      ? pageConfig.artists.artists
      : [];

    const finalArtists = {
      ...(pageConfig.artists || {}),
      artists: artistItems.length > 0
        ? artistItems.map((item: any, idx: number) => {
            const fallback = pageArtists[idx] || {};
            return {
              id: String(fallback.id ?? `a-${item.id}`),
              name: item.name,
              image: item.imageUrl || String(fallback.image ?? fallback.imageUrl ?? ''),
              status: String(fallback.status ?? 'revealed'),
              description: String(fallback.description ?? ''),
              hints: Array.isArray(fallback.hints) ? fallback.hints : [],
            };
          })
        : pageArtists,
    };

    const pageArtistsExtra = Array.isArray(pageConfig?.artistsExtra?.artists)
      ? pageConfig.artistsExtra.artists
      : [];

    const finalArtistsExtra = {
      ...(pageConfig.artistsExtra || {}),
      artists: artistExtraItems.length > 0
        ? artistExtraItems.map((item: any, idx: number) => {
            const fallback = pageArtistsExtra[idx] || {};
            return {
              id: String(fallback.id ?? `ax2-${item.id}`),
              name: item.name,
              image: item.imageUrl || String(fallback.image ?? fallback.imageUrl ?? ''),
              status: String(item.status ?? fallback.status ?? 'revealed'),
              description: String(item.description ?? fallback.description ?? ''),
              hints: Array.isArray(fallback.hints) ? fallback.hints : [],
            };
          })
        : pageArtistsExtra,
    };

    // DB Items are the Source of Truth
    const finalTimeline = {
      ...(pageConfig.timeline || {}),
      items: timelineItems.map((item: any) => ({
        id: item.id,
        time: item.timeLabel,
        title: item.title,
        description: item.description,
      })),
    };

    const finalJourney = {
      ...(pageConfig.journey || {}),
      items: journeyItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        image: item.imageUrl,
      })),
    };

    const finalFooter = {
      ...(pageConfig.footer || {}),
      logos: sponsorItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        image: item.imageUrl,
      })),
      // Aliases
      items: sponsorItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        image: item.imageUrl,
      })),
      cards: sponsorItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        image: item.imageUrl,
      })),
    };

    const finalRules = {
      ...(pageConfig.rules || {}),
      // Section 9 in Admin UI is a single block, NOT a list.
      // So we only provide sectionTitle and content as strings.
      sectionTitle: (ruleItems.length > 0 && ruleItems[0].title) ? ruleItems[0].title : (pageConfig.rules?.sectionTitle || 'QUY ĐỊNH CHUNG'),
      // Admin UI expects 'content' as a single text block
      content: ruleItems.length > 0 ? ruleItems.map((r: any) => r.content || '').join('\n\n') : (pageConfig.rules?.content || '')
    };

    // Ensure 'cards' alias for admin compatibility if needed
    if (finalJourney.items) {
      (finalJourney as any).cards = finalJourney.items;
    }

    return {
      ...pageConfig,
      artists: finalArtists,
      artistsExtra: finalArtistsExtra,
      timeline: finalTimeline,
      journey: finalJourney,
      footer: finalFooter,
      rules: finalRules,
      registrationOpen: event.registrationOpen,
    };
  }

  async updateEventConfig(slug: string, config: any) {
    const target = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!target) {
      throw new NotFoundException(`Event with slug ${slug} not found`);
    }

    console.log('HUIT FEST: Received update config for slug:', slug);
    console.log('HUIT FEST: journey items from config:', JSON.stringify(config?.journey?.items || [], null, 2));
    console.log('HUIT FEST: journey cards from config:', JSON.stringify(config?.journey?.cards || [], null, 2));
    console.log('HUIT FEST: rules from config:', JSON.stringify(config?.rules || {}, null, 2));
    console.log('HUIT FEST: footer from config:', JSON.stringify(config?.footer || {}, null, 2));

    const timelineItems = this.normalizeTimelineItems(config);
    const journeyItems = this.normalizeJourneyItems(config);
    const sponsorItems = this.normalizeSponsorItems(config);
    const ruleItems = this.normalizeRuleItems(config);
    const artistItems = this.normalizeArtistItems(config);
    const artistExtraItems = this.normalizeArtistsExtraItems(config);

    console.log(`HUIT FEST: Normalized ${artistItems.length} artists, ${artistExtraItems.length} artistsExtra, ${timelineItems.length} timeline, ${journeyItems.length} journey, ${sponsorItems.length} sponsors, ${ruleItems.length} rules`);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update the JSON config
      const updatedEvent = await tx.event.update({
        where: { id: target.id },
        data: { 
          pageConfig: config,
          registrationOpen: config.registrationOpen !== undefined ? !!config.registrationOpen : undefined
        },
      });

      // 2. Sync with TimelineItem table
      await (tx as any).timelineitem.deleteMany({
        where: { eventId: target.id }
      });

      if (timelineItems.length > 0) {
        await (tx as any).timelineitem.createMany({
          data: timelineItems.map((item, idx) => ({
            eventId: target.id,
            timeLabel: item.time,
            title: item.title,
            description: item.description,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 3. Sync with JourneyItem table
      await (tx as any).journeyitem.deleteMany({
        where: { eventId: target.id }
      });

      if (journeyItems.length > 0) {
        await (tx as any).journeyitem.createMany({
          data: journeyItems.map((item, idx) => ({
            eventId: target.id,
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 4. Sync with Sponsor table
      await (tx as any).sponsor.deleteMany({
        where: { eventId: target.id }
      });

      if (sponsorItems.length > 0) {
        await (tx as any).sponsor.createMany({
          data: sponsorItems.map((item, idx) => ({
            eventId: target.id,
            name: item.name,
            imageUrl: item.imageUrl,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 5. Sync with RuleItem table
      await (tx as any).ruleitem.deleteMany({
        where: { eventId: target.id }
      });

      if (ruleItems.length > 0) {
        await (tx as any).ruleitem.createMany({
          data: ruleItems.map((item, idx) => ({
            eventId: target.id,
            title: item.title,
            content: item.content,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 6. Sync with Artist table (section artists)
      await tx.artist.deleteMany({
        where: { eventId: target.id }
      });

      if (artistItems.length > 0) {
        await tx.artist.createMany({
          data: artistItems.map((item, idx) => ({
            eventId: target.id,
            name: item.name,
            imageUrl: item.imageUrl,
            sortOrder: idx + 1,
          })),
        });
      }

      // 7. Sync with ArtistExtraItem table (section artistsExtra)
      const txAny = tx as any;
      if (txAny.artistextraitem && typeof txAny.artistextraitem.deleteMany === 'function') {
        await txAny.artistextraitem.deleteMany({
          where: { eventId: target.id }
        });

        if (artistExtraItems.length > 0) {
          await txAny.artistextraitem.createMany({
            data: artistExtraItems.map((item, idx) => ({
              eventId: target.id,
              name: item.name,
              imageUrl: item.imageUrl,
              description: item.description,
              status: item.status,
              sortOrder: idx + 1,
              updatedAt: now,
            })),
          });
        }
      } else {
        // Fallback when Prisma Client has not been regenerated yet.
        await tx.$executeRawUnsafe('DELETE FROM `artistextraitem` WHERE eventId = ?', target.id);
        if (artistExtraItems.length > 0) {
          for (let idx = 0; idx < artistExtraItems.length; idx += 1) {
            const item = artistExtraItems[idx];
            await tx.$executeRawUnsafe(
              'INSERT INTO `artistextraitem` (`eventId`, `name`, `imageUrl`, `description`, `status`, `sortOrder`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              target.id,
              item.name,
              item.imageUrl,
              item.description,
              item.status,
              idx + 1,
              now,
              now,
            );
          }
        }
      }

      return updatedEvent;
    });
  }
  
  async toggleRegistration(slug: string, open: boolean) {
    const target = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Event not found');
    
    return this.prisma.event.update({
      where: { id: target.id },
      data: { registrationOpen: !!open },
    });
  }
}
