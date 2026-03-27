import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma.service';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

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
      select: { id: true, pageConfig: true },
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

    const pageConfig = event.pageConfig && typeof event.pageConfig === 'object'
      ? (event.pageConfig as Record<string, any>)
      : {};

    // DB Items are the Source of Truth
    const finalTimeline = {
      ...(pageConfig.timeline || {}),
      items: timelineItems.map((item) => ({
        id: item.id,
        time: item.timeLabel,
        title: item.title,
        description: item.description,
      })),
    };

    const finalJourney = {
      ...(pageConfig.journey || {}),
      items: journeyItems.map((item) => ({
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
      timeline: finalTimeline,
      journey: finalJourney,
      footer: finalFooter,
      rules: finalRules,
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

    console.log(`HUIT FEST: Normalized ${timelineItems.length} timeline, ${journeyItems.length} journey, ${sponsorItems.length} sponsors, ${ruleItems.length} rules`);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update the JSON config
      const updatedEvent = await tx.event.update({
        where: { id: target.id },
        data: { pageConfig: config },
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

      return updatedEvent;
    });
  }
}
