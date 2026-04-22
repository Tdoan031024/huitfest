import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma.service';

@Injectable()
export class EventService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeArtistItems(config: any): Array<{ name: string; imageUrl: string; status: string; description: string; hints: any[] }> {
    const section = config?.artists;
    if (!section) return [];

    let rawItems = [];
    if (Array.isArray(section)) {
      rawItems = section;
    } else if (typeof section === 'object' && Array.isArray(section.artists)) {
      rawItems = section.artists;
    }

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
    const section = config?.artistsExtra;
    if (!section) return [];

    let rawItems = [];
    if (Array.isArray(section)) {
      rawItems = section;
    } else if (typeof section === 'object' && Array.isArray(section.artists)) {
      rawItems = section.artists;
    }

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

  private normalizeSponsorItems(config: any): Array<{ name: string; imageUrl: string; category: string }> {
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
        category: String(item.category ?? 'GOLD'),
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

  private normalizeInstructionItems(config: any): Array<{ title: string; content: string }> {
    if (!config || !config.instructions) return [];
    
    const rawItems = Array.isArray(config.instructions.items) ? config.instructions.items : 
                   (Array.isArray(config.instructions.cards) ? config.instructions.cards : null);

    if (rawItems) {
      return rawItems
        .filter((item: any) => item && typeof item === 'object')
        .map((item: any) => ({
          title: String(item.title ?? ''),
          content: String(item.content ?? ''),
        }));
    }
    
    return [];
  }

  async getCurrentEvent() {
    const now = new Date();
    const event = await this.prisma.event.findFirst({
      where: {
        startAt: { lte: now },
      },
      select: { slug: true }
    });

    if (event) {
      return this.getEventConfig(event.slug);
    }

    const latest = await this.prisma.event.findFirst({
      orderBy: { startAt: 'desc' },
      select: { slug: true }
    });

    if (!latest) {
      throw new NotFoundException('No event data found');
    }

    return this.getEventConfig(latest.slug);
  }

  async getEventConfig(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { 
        id: true, 
        slug: true,
        title: true, 
        subtitle: true, 
        description: true, 
        heroImage: true, 
        startAt: true, 
        videoUrl: true,
        pageConfig: true, 
        registrationOpen: true 
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    const sponsorItems = await this.prisma.sponsor.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    // 2. Artist items
    const artistItems = await this.prisma.artist.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    // 3. Talent items (formerly artistextraitem)
    const artistExtraItems = await this.prisma.talent.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    // 4. Timeline items (formerly agendaitem)
    const timelineItems = await this.prisma.timelineitem.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    // 5. Instruction items
    const instructionItems = await this.prisma.instruction.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    // 6. Rule items
    const ruleItems = await this.prisma.rule.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    // 7. Journey items
    const journeyItems = await this.prisma.journeyitem.findMany({
      where: { eventId: event.id },
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    let pageConfig: Record<string, any> = {};
    if (event.pageConfig) {
      if (typeof event.pageConfig === 'string') {
        try {
          pageConfig = JSON.parse(event.pageConfig);
        } catch (e) {
          console.error('Error parsing pageConfig:', e);
          pageConfig = {};
        }
      } else if (typeof event.pageConfig === 'object') {
        pageConfig = event.pageConfig as any;
      }
    }

    // Sync with timelineitem for timeline
    const finalTimeline = {
      ...(pageConfig.timeline || {}),
      items: timelineItems.map((item: any) => ({
        id: item.id,
        time: item.time,
        title: item.title,
        description: item.description,
      })),
    };

    const finalFooter = {
      ...(pageConfig.footer || {}),
      logos: sponsorItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        category: item.category,
      })),
    };

    const finalRules = {
      ...(pageConfig.rules || {}),
      sectionTitle: pageConfig.rules?.sectionTitle || (ruleItems.length > 0 ? ruleItems[0].title : 'QUY ĐỊNH CHUNG'),
      content: pageConfig.rules?.content || '',
      items: ruleItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content
      }))
    };

    const finalInstructions = {
      ...(pageConfig.instructions || {}),
      items: instructionItems.map((item: any) => {
        const jsonItem = (pageConfig.instructions?.items || []).find((ji: any) => ji.title === item.title);
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          imageUrl: jsonItem?.imageUrl || jsonItem?.image || ''
        };
      })
    };

    const finalJourney = {
      ...(pageConfig.journey || {}),
      items: journeyItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        image: item.imageUrl
      }))
    };

    return {
      ...pageConfig,
      id: event.id,
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      heroImage: event.heroImage,
      startAt: event.startAt,
      videoUrl: event.videoUrl,
      artists: {
        ...(pageConfig.artists || {}),
        artists: artistItems.map((item: any, idx: number) => ({
          id: item.id,
          name: item.name,
          image: item.imageUrl,
          description: item.description,
        })),
      },
      artistsExtra: {
        ...(pageConfig.artistsExtra || {}),
        artists: artistExtraItems.map((item: any, idx: number) => ({
          id: item.id,
          name: item.name,
          image: item.imageUrl,
          description: item.description,
          status: item.status,
        })),
      },
      timeline: finalTimeline,
      footer: finalFooter,
      rules: finalRules,
      instructions: finalInstructions,
      journey: finalJourney,
      sponsors: sponsorItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        category: item.category,
      })),
      registrationOpen: event.registrationOpen,
    };
  }

  async updateEventConfig(slug: string, config: any) {
    const target = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true, slug: true, pageConfig: true },
    });

    if (!target) {
      throw new NotFoundException(`Event with slug ${slug} not found`);
    }

    const agendaItems = this.normalizeTimelineItems(config);
    const sponsorItems = this.normalizeSponsorItems(config);
    const ruleItems = this.normalizeRuleItems(config);
    const instructionItems = this.normalizeInstructionItems(config);
    const artistItems = this.normalizeArtistItems(config);
    const artistExtraItems = this.normalizeArtistsExtraItems(config);
    const journeyItems = (config.journey?.items || []).map((item: any) => ({
      title: item.title,
      content: item.content,
      imageUrl: item.image
    }));

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update the event record (including core fields if provided in config)
      // We merge the incoming config with existing pageConfig
      let currentConfig: any = {};
      if (typeof target.pageConfig === 'string' && target.pageConfig.trim()) {
        try {
          currentConfig = JSON.parse(target.pageConfig);
        } catch (e) {
          currentConfig = {};
        }
      } else if (target.pageConfig && typeof target.pageConfig === 'object') {
        currentConfig = target.pageConfig;
      }
      
      const mergedConfig = { ...currentConfig, ...config };

      // Ensure pageConfig is stored as a string since it's @db.LongText in schema
      const stringifiedConfig = typeof mergedConfig === 'string' 
        ? mergedConfig 
        : JSON.stringify(mergedConfig);

      const updatedEvent = await tx.event.update({
        where: { id: target.id },
        data: { 
          title: config.title ?? undefined,
          subtitle: config.subtitle ?? undefined,
          description: config.description ?? undefined,
          heroImage: config.heroImage ?? undefined,
          startAt: config.startAt ? new Date(config.startAt) : undefined,
          videoUrl: config.videoUrl === undefined ? undefined : (config.videoUrl || null),
          pageConfig: stringifiedConfig,
          registrationOpen: config.registrationOpen !== undefined ? !!config.registrationOpen : undefined
        },
      });

      // 2. Sync with TimelineItem table (formerly AgendaItem)
      await tx.timelineitem.deleteMany({
        where: { eventId: target.id }
      });

      if (agendaItems.length > 0) {
        await tx.timelineitem.createMany({
          data: agendaItems.map((item, idx) => ({
            eventId: target.id,
            time: item.time,
            title: item.title,
            description: item.description,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 3. Sync with Sponsor table
      await tx.sponsor.deleteMany({
        where: { eventId: target.id }
      });

      if (sponsorItems.length > 0) {
        await tx.sponsor.createMany({
          data: sponsorItems.map((item, idx) => ({
            eventId: target.id,
            name: item.name,
            imageUrl: item.imageUrl,
            category: item.category,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 4. Sync with Rule table
      await tx.rule.deleteMany({
        where: { eventId: target.id }
      });

      if (ruleItems.length > 0) {
        await tx.rule.createMany({
          data: ruleItems.map((item, idx) => ({
            eventId: target.id,
            title: item.title,
            content: item.content,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 5. Sync with Instruction table
      await tx.instruction.deleteMany({
        where: { eventId: target.id }
      });

      if (instructionItems.length > 0) {
        await tx.instruction.createMany({
          data: instructionItems.map((item, idx) => ({
            eventId: target.id,
            title: item.title,
            content: item.content,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 6. Sync with JourneyItem table
      await tx.journeyitem.deleteMany({
        where: { eventId: target.id }
      });

      if (journeyItems.length > 0) {
        await tx.journeyitem.createMany({
          data: journeyItems.map((item: any, idx: number) => ({
            eventId: target.id,
            title: item.title,
            content: item.content,
            imageUrl: item.imageUrl,
            sortOrder: idx + 1,
            updatedAt: now,
          })),
        });
      }

      // 7. Sync with Artist table
      await tx.artist.deleteMany({
        where: { eventId: target.id }
      });

      if (artistItems.length > 0) {
        await tx.artist.createMany({
          data: artistItems.map((item, idx) => ({
            eventId: target.id,
            name: item.name,
            imageUrl: item.imageUrl,
            description: item.description,
            sortOrder: idx + 1,
          })),
        });
      }

      // 8. Sync with Talent table (formerly ArtistExtraItem)
      await tx.talent.deleteMany({
        where: { eventId: target.id }
      });

      if (artistExtraItems.length > 0) {
        await tx.talent.createMany({
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
