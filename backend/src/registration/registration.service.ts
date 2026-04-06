import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as nodemailer from 'nodemailer';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import * as sharpModule from 'sharp';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as http from 'node:http';
import * as https from 'node:https';
import { join } from 'node:path';

import { EventService } from '../event/event.service';
import { PrismaService } from '../prisma.service';
import { AdminRegistrationQueryDto } from './dto/admin-registration-query.dto';
import { BulkUpdateAdminRegistrationDto } from './dto/bulk-update-admin-registration.dto';
import { CheckinTicketDto } from './dto/checkin-ticket.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateAdminRegistrationDto } from './dto/update-admin-registration.dto';
import { VerifyTicketDto } from './dto/verify-ticket.dto';

type RegistrationStatus = 'pending' | 'approved' | 'rejected';

type RegistrationAdminMeta = {
  status?: RegistrationStatus;
  priority?: boolean;
  rejectedReason?: string;
  ticketCode?: string;
  emailSentAt?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  checkInGate?: string;
};

type TicketTokenPayload = {
  eventId: number;
  registrationId: number;
  ticketCode: string;
  exp: number;
};

type TicketLookupResult =
  | {
      kind: 'ok';
      registration: RegistrationRecord;
      parsed: ParsedRegistrationNote;
      ticketCode: string;
    }
  | {
      kind: 'invalid';
      message: string;
    }
  | {
      kind: 'wrong_event';
      message: string;
    };

type ParsedRegistrationNote = {
  plainNote: string;
  adminMeta: RegistrationAdminMeta;
};

type RegistrationRecord = {
  id: number;
  eventId: number;
  fullName: string;
  email: string;
  phone: string;
  role: string | null;
  school: string | null;
  major: string | null;
  province: string | null;
  campus: string | null;
  note: string | null;
  checkedIn: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  private parseRegistrationNote(note: string | null | undefined): ParsedRegistrationNote {
    if (!note) {
      return { plainNote: '', adminMeta: {} };
    }

    try {
      const parsed = JSON.parse(note);
      if (parsed && typeof parsed === 'object') {
        const plainNote = typeof parsed.plainNote === 'string' ? parsed.plainNote : '';
        const rawMeta = parsed.adminMeta && typeof parsed.adminMeta === 'object' ? parsed.adminMeta : {};

        const status: RegistrationStatus | undefined =
          rawMeta.status === 'approved' || rawMeta.status === 'rejected' || rawMeta.status === 'pending'
            ? rawMeta.status
            : undefined;

        return {
          plainNote,
          adminMeta: {
            status,
            priority: Boolean(rawMeta.priority),
            rejectedReason:
              typeof rawMeta.rejectedReason === 'string' ? rawMeta.rejectedReason.trim() : undefined,
            ticketCode: typeof rawMeta.ticketCode === 'string' ? rawMeta.ticketCode.trim() : undefined,
            emailSentAt: typeof rawMeta.emailSentAt === 'string' ? rawMeta.emailSentAt : undefined,
            checkedInAt: typeof rawMeta.checkedInAt === 'string' ? rawMeta.checkedInAt : undefined,
            checkedInBy: typeof rawMeta.checkedInBy === 'string' ? rawMeta.checkedInBy.trim() : undefined,
            checkInGate: typeof rawMeta.checkInGate === 'string' ? rawMeta.checkInGate.trim() : undefined,
          },
        };
      }
    } catch (error) {
      // Old records may store plain text in note.
    }

    return {
      plainNote: String(note),
      adminMeta: {},
    };
  }

  private serializeRegistrationNote(payload: ParsedRegistrationNote): string | null {
    const plainNote = (payload.plainNote || '').trim();
    const adminMeta = payload.adminMeta || {};
    const hasMeta =
      (adminMeta.status && adminMeta.status !== 'pending') ||
      adminMeta.priority ||
      Boolean(adminMeta.rejectedReason) ||
      Boolean(adminMeta.ticketCode) ||
      Boolean(adminMeta.emailSentAt) ||
      Boolean(adminMeta.checkedInAt) ||
      Boolean(adminMeta.checkedInBy) ||
      Boolean(adminMeta.checkInGate);

    if (!plainNote && !hasMeta) {
      return null;
    }

    if (!hasMeta) {
      return plainNote || null;
    }

    const safeMeta: RegistrationAdminMeta = {
      status: adminMeta.status && adminMeta.status !== 'pending' ? adminMeta.status : undefined,
      priority: adminMeta.priority ? true : undefined,
      rejectedReason: adminMeta.rejectedReason || undefined,
      ticketCode: adminMeta.ticketCode || undefined,
      emailSentAt: adminMeta.emailSentAt || undefined,
      checkedInAt: adminMeta.checkedInAt || undefined,
      checkedInBy: adminMeta.checkedInBy || undefined,
      checkInGate: adminMeta.checkInGate || undefined,
    };

    return JSON.stringify({
      plainNote: plainNote || undefined,
      adminMeta: safeMeta,
    });
  }

  private resolveStatus(meta: RegistrationAdminMeta): RegistrationStatus {
    if (meta.status === 'approved' || meta.status === 'rejected') {
      return meta.status;
    }
    return 'pending';
  }

  private toAdminRegistrationRow(registration: RegistrationRecord) {
    const parsed = this.parseRegistrationNote(registration.note);
    const status = this.resolveStatus(parsed.adminMeta);
    const audience = (registration.role || '').trim() || 'Khac';
    const audienceKey = this.normalizeLooseText(audience);
    const isHighSchool = audienceKey === 'hoc sinh thpt';
    const isHuitStudent = audienceKey === 'sinh vien huit';
    const schoolOrStudentId =
      isHighSchool
        ? (registration.school || '').trim()
        : isHuitStudent
          ? (registration.major || '').trim()
          : ((registration.school || registration.major || '') as string).trim();

    return {
      id: registration.id,
      fullName: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      audience,
      schoolOrStudentId,
      schoolName: registration.school || '',
      studentId: registration.major || '',
      birthDate: registration.province || '',
      referralCode: registration.campus || '',
      status,
      priority: Boolean(parsed.adminMeta.priority),
      rejectedReason: parsed.adminMeta.rejectedReason || '',
      ticketCode: parsed.adminMeta.ticketCode || '',
      emailSentAt: parsed.adminMeta.emailSentAt || '',
      checkedIn: Boolean(registration.checkedIn),
      checkedInAt: parsed.adminMeta.checkedInAt || '',
      checkedInBy: parsed.adminMeta.checkedInBy || '',
      checkInGate: parsed.adminMeta.checkInGate || '',
      note: parsed.plainNote,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    };
  }

  private parsePriorityFilter(value: string | undefined): boolean | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
  }

  private sanitizeSearchKeyword(value: string | undefined): string {
    return String(value || '').trim();
  }

  private normalizeLooseText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private formatDateTime(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', { hour12: false });
  }

  private dataUrlToBuffer(dataUrl: string): Buffer | null {
    const value = String(dataUrl || '');
    const commaIndex = value.indexOf(',');
    if (commaIndex < 0) return null;
    const base64 = value.slice(commaIndex + 1).trim();
    if (!base64) return null;

    try {
      return Buffer.from(base64, 'base64');
    } catch {
      return null;
    }
  }

  private async normalizePdfImageBuffer(buffer: Buffer | null): Promise<Buffer | null> {
    if (!buffer) return null;
    try {
      const sharpFactory =
        ((sharpModule as unknown as { default?: (...args: unknown[]) => { png: () => { toBuffer: () => Promise<Buffer> } } })
          .default || (sharpModule as unknown as (...args: unknown[]) => { png: () => { toBuffer: () => Promise<Buffer> } }));

      if (typeof sharpFactory !== 'function') {
        return buffer;
      }

      return await sharpFactory(buffer).png().toBuffer();
    } catch {
      return buffer;
    }
  }

  private async downloadBufferFromUrl(rawUrl: string | undefined, redirectLeft = 3): Promise<Buffer | null> {
    const urlText = String(rawUrl || '').trim();
    if (!urlText) return null;

    try {
      const parsed = new URL(urlText);
      const client = parsed.protocol === 'https:' ? https : http;

      return await new Promise<Buffer | null>((resolve) => {
        const request = client.get(parsed, (response) => {
          const statusCode = response?.statusCode || 0;
          if (!response || statusCode >= 400) {
            response?.resume();
            resolve(null);
            return;
          }

          // Follow redirect for CDN or asset routing.
          if (statusCode >= 300 && statusCode < 400) {
            const location = response.headers.location;
            response.resume();
            if (!location || redirectLeft <= 0) {
              resolve(null);
              return;
            }

            const nextUrl = location.startsWith('http') ? location : `${parsed.protocol}//${parsed.host}${location}`;
            this.downloadBufferFromUrl(nextUrl, redirectLeft - 1).then(resolve).catch(() => resolve(null));
            return;
          }

          const contentType = String(response.headers['content-type'] || '').toLowerCase();
          if (!contentType.startsWith('image/')) {
            response.resume();
            resolve(null);
            return;
          }

          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', () => resolve(null));
        });

        request.on('error', () => resolve(null));
        request.setTimeout(10000, () => {
          request.destroy();
          resolve(null);
        });
      });
    } catch {
      return null;
    }
  }

  private uniqueExistingDirs(paths: string[]): string[] {
    const seen = new Set<string>();
    const results: string[] = [];

    for (const rawPath of paths) {
      const candidate = String(rawPath || '').trim();
      if (!candidate || seen.has(candidate) || !existsSync(candidate)) {
        continue;
      }
      seen.add(candidate);
      results.push(candidate);
    }

    return results;
  }

  private getRuntimeRoots(): string[] {
    const cwd = process.cwd();
    const baseCandidates = [
      cwd,
      join(cwd, 'backend'),
      join(cwd, '..', 'backend'),
      join(__dirname, '..', '..'),
      join(__dirname, '..', '..', '..'),
      join(__dirname, '..', '..', '..', '..'),
    ];

    const rootCandidates: string[] = [];
    for (const base of baseCandidates) {
      rootCandidates.push(base);
      rootCandidates.push(join(base, '..'));
    }

    return this.uniqueExistingDirs(rootCandidates);
  }

  private async readFirstAvailableBuffer(filePathCandidates: string[]): Promise<Buffer | null> {
    for (const filePath of filePathCandidates) {
      try {
        return await readFile(filePath);
      } catch {
        // Try next candidate path.
      }
    }
    return null;
  }

  private generateTicketCode(eventId: number, registrationId: number): string {
    const timestamp = Date.now().toString().slice(-6);
    return `HF${eventId}-${registrationId}-${timestamp}`;
  }

  private async createTicketPdf(payload: {
    ticketCode: string;
    fullName: string;
    email: string;
    phone: string;
    eventName: string;
    eventDateTime: string;
    eventLocation: string;
    ticketInfo: string;
    sentAt: string;
    verifyUrl: string;
    qrCodeDataUrl: string;
    supportEmail: string;
    supportPhone: string;
  }): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 24 });

    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const cardX = 22;
    const cardY = 22;
    const cardWidth = pageWidth - 44;
    const cardHeight = pageHeight - 44;
    const contentX = cardX + 14;
    const contentY = cardY + 12;
    const contentWidth = cardWidth - 28;
    const gap = 16;
    const leftWidth = Math.floor(contentWidth * 0.53);
    const rightWidth = contentWidth - leftWidth - gap;
    const leftX = contentX;
    const rightX = leftX + leftWidth + gap;
    const qrY = contentY + 96;

    const truncate = (text: string, max: number) => {
      const v = String(text || '').trim();
      if (v.length <= max) return v;
      return `${v.slice(0, Math.max(1, max - 3))}...`;
    };

    const regularFontPathCandidates = [
      join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf'),
      'C:/Windows/Fonts/arial.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ];
    const boldFontPathCandidates = [
      join(process.cwd(), 'assets', 'fonts', 'NotoSans-Bold.ttf'),
      'C:/Windows/Fonts/arialbd.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    ];
    const regularFontPath = regularFontPathCandidates.find((path) => existsSync(path));
    const boldFontPath = boldFontPathCandidates.find((path) => existsSync(path));
    const setRegular = () => doc.font(regularFontPath || 'Helvetica');
    const setBold = () => doc.font(boldFontPath || 'Helvetica-Bold');

    doc.rect(cardX, cardY, cardWidth, cardHeight).lineWidth(1).stroke('#d1d5db');

    const runtimeRoots = this.getRuntimeRoots();
    const logoPathCandidates = runtimeRoots.flatMap((rootPath) => [
      join(rootPath, 'frontend', 'public', 'assets', 'images', 'logo', 'logohuit.png'),
      join(rootPath, 'frontend', 'public', 'assets', 'images', 'logo', 'logohuit.jpg'),
      join(rootPath, 'frontend', 'public', 'assets', 'images', 'logo', 'logohuit.webp'),
    ]);
    const bannerPathCandidates = runtimeRoots.flatMap((rootPath) => [
      join(rootPath, 'frontend', 'public', 'assets', 'images', 'banner', 'banner.png'),
      join(rootPath, 'frontend', 'public', 'assets', 'images', 'banner', 'banner.webp'),
    ]);

    let logoBuffer: Buffer | null = null;
    let bannerBuffer: Buffer | null = null;
    logoBuffer = await this.readFirstAvailableBuffer(logoPathCandidates);

    if (!logoBuffer) {
      const emailLogoUrl = process.env.EMAIL_LOGO_URL;
      if (emailLogoUrl) {
        logoBuffer = await this.downloadBufferFromUrl(emailLogoUrl);
      }
    }
    bannerBuffer = await this.readFirstAvailableBuffer(bannerPathCandidates);

    const qrBuffer = await this.normalizePdfImageBuffer(this.dataUrlToBuffer(payload.qrCodeDataUrl));
    logoBuffer = await this.normalizePdfImageBuffer(logoBuffer);
    bannerBuffer = await this.normalizePdfImageBuffer(bannerBuffer);

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, leftX, contentY + 2, { width: 94 });
      } catch {
        setBold().fontSize(18).fillColor('#111827').text('HUIT FEST', leftX, contentY + 8);
      }
    } else {
      setBold().fontSize(18).fillColor('#111827').text('HUIT FEST', leftX, contentY + 8);
    }

    setBold().fontSize(30).fillColor('#111827').text('FANZONE', rightX, contentY + 2, { width: rightWidth });
    doc.moveTo(leftX, contentY + 52).lineTo(contentX + contentWidth, contentY + 52).strokeColor('#e5e7eb').lineWidth(1).stroke();

    setBold().fontSize(14).fillColor('#111827').text('VÉ THAM DỰ SỰ KIỆN', leftX, contentY + 62, { width: leftWidth });
    setRegular().fontSize(10).fillColor('#4b5563').text('Vé của bạn đã sẵn sàng. Chúc bạn có trải nghiệm thật vui!', leftX, contentY + 80, { width: leftWidth });

    setBold().fontSize(11).fillColor('#111827').text('Mã vé', rightX, contentY + 64);
    setRegular().fontSize(11).fillColor('#111827').text(`#${truncate(payload.ticketCode, 28)}`, rightX + 78, contentY + 64, {
      width: rightWidth - 78,
      align: 'right',
      lineBreak: false,
    });
    setBold().fontSize(11).fillColor('#111827').text('Thông tin vé', rightX, contentY + 84);
    setRegular().fontSize(11).fillColor('#111827').text(truncate(payload.ticketInfo, 22), rightX + 78, contentY + 84, {
      width: rightWidth - 78,
      align: 'right',
      lineBreak: false,
    });

    if (bannerBuffer) {
      try {
        doc.image(bannerBuffer, leftX, contentY + 106, { width: leftWidth, height: 122 });
      } catch {
        doc.rect(leftX, contentY + 106, leftWidth, 122).fill('#e5e7eb');
      }
    } else {
      doc.rect(leftX, contentY + 106, leftWidth, 122).fill('#e5e7eb');
    }

    const titleY = contentY + 242;
    setBold().fontSize(16).fillColor('#111827').text(truncate(payload.eventName, 34), leftX, titleY, {
      width: leftWidth,
      lineBreak: false,
    });

    let rowY = titleY + 24;
    const rowHeight = 21;
    const drawRow = (label: string, value: string) => {
      setBold().fontSize(10).fillColor('#111827').text(label, leftX, rowY + 5, { width: 98, lineBreak: false });
      setRegular().fontSize(10).fillColor('#111827').text(value, leftX + 102, rowY + 5, {
        width: leftWidth - 102,
        align: 'right',
        lineBreak: false,
      });
      doc.moveTo(leftX, rowY + rowHeight).lineTo(leftX + leftWidth, rowY + rowHeight).strokeColor('#e5e7eb').lineWidth(1).stroke();
      rowY += rowHeight;
    };

    drawRow('Ngày giờ', truncate(payload.eventDateTime, 26));
    drawRow('Địa điểm', truncate(payload.eventLocation, 36));
    drawRow('Tên khách hàng', truncate(payload.fullName, 30));
    drawRow('Email', truncate(payload.email, 36));
    drawRow('Số điện thoại', truncate(payload.phone || '-', 20));
    drawRow('Mã đặt chỗ', `#${truncate(payload.ticketCode, 24)}`);
    drawRow('Loại vé', truncate(payload.ticketInfo, 24));
    drawRow('Thời gian nhận vé', truncate(payload.sentAt, 26));

    const noteY = rowY + 10;
    doc.roundedRect(leftX, noteY, leftWidth, 76, 4).fill('#dbf4df');
    setBold().fillColor('#166534').fontSize(11).text('Lưu ý của ban tổ chức', leftX + 10, noteY + 12);
    setRegular().fillColor('#166534').fontSize(9).text('Không phải bản in vé. Vui lòng mở điện thoại để check-in tại cổng.', leftX + 10, noteY + 30, {
      width: leftWidth - 20,
    });

    if (qrBuffer) {
      try {
        doc.image(qrBuffer, rightX, qrY, { width: rightWidth, height: rightWidth });
      } catch {
        doc.rect(rightX, qrY, rightWidth, rightWidth).fill('#f3f4f6');
      }
    } else {
      doc.rect(rightX, qrY, rightWidth, rightWidth).fill('#f3f4f6');
    }

    setRegular().fontSize(9).fillColor('#6b7280').text('Mã QR chỉ được check-in một lần duy nhất.', rightX, qrY + rightWidth + 10, { width: rightWidth });
    doc.text('Vui lòng bảo mật thông tin mã QR trên vé của mình.', rightX, qrY + rightWidth + 24, { width: rightWidth });

    const supportY = qrY + rightWidth + 62;
    doc.moveTo(rightX, supportY - 8).lineTo(rightX + rightWidth, supportY - 8).strokeColor('#e5e7eb').lineWidth(1).stroke();
    const ticketPortalUrl = (process.env.TICKET_PORTAL_URL || 'https://huitfest.huitmedia.edu.vn/').trim();
    setBold().fillColor('#111827').fontSize(12).text('Thông tin hỗ trợ', rightX, supportY);
    setRegular().fillColor('#374151').fontSize(10)
      .text(`Email: ${truncate(payload.supportEmail, 42)}`, rightX, supportY + 18, { width: rightWidth })
      .text(`Hotline: ${truncate(payload.supportPhone, 24)}`, rightX, supportY + 34, { width: rightWidth })
      .text(`Link vé: ${truncate(ticketPortalUrl, 92)}`, rightX, supportY + 50, { width: rightWidth, height: 56 });

    doc.rect(cardX, pageHeight - 56, cardWidth, 28).fill('#dc2626');
    setBold().fillColor('#ffffff').fontSize(12).text('HƯỚNG DẪN SỬ DỤNG VÉ', cardX, pageHeight - 48, {
      width: cardWidth,
      align: 'center',
      lineBreak: false,
    });

    doc.end();
    return done;
  }

  private getTicketTokenSecret(): string {
    return process.env.TICKET_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET || 'huitfest-ticket-secret';
  }

  private getTicketTokenTtlSeconds(): number {
    const ttl = Number(process.env.TICKET_TOKEN_TTL_SECONDS || '604800');
    return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 604800;
  }

  private secureCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, 'utf8');
    const bBuffer = Buffer.from(b, 'utf8');
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
  }

  private signTicketPayload(payloadText: string): string {
    return createHmac('sha256', this.getTicketTokenSecret()).update(payloadText).digest('base64url');
  }

  private createTicketToken(payload: Omit<TicketTokenPayload, 'exp'>): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const fullPayload: TicketTokenPayload = {
      ...payload,
      exp: nowSeconds + this.getTicketTokenTtlSeconds(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
    const signature = this.signTicketPayload(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  private verifyTicketToken(token: string): TicketTokenPayload | null {
    const tokenParts = String(token || '').trim().split('.');
    if (tokenParts.length !== 2) {
      return null;
    }

    const [encodedPayload, providedSignature] = tokenParts;
    const expectedSignature = this.signTicketPayload(encodedPayload);
    if (!this.secureCompare(providedSignature, expectedSignature)) {
      return null;
    }

    try {
      const payloadText = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const parsed = JSON.parse(payloadText) as Partial<TicketTokenPayload>;
      if (
        !Number.isFinite(parsed.eventId) ||
        !Number.isFinite(parsed.registrationId) ||
        typeof parsed.ticketCode !== 'string' ||
        !Number.isFinite(parsed.exp)
      ) {
        return null;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      if ((parsed.exp as number) <= nowSeconds) {
        return null;
      }

      return {
        eventId: Number(parsed.eventId),
        registrationId: Number(parsed.registrationId),
        ticketCode: parsed.ticketCode.trim(),
        exp: Number(parsed.exp),
      };
    } catch {
      return null;
    }
  }

  private buildTicketVerifyUrl(token: string): string {
    const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://huitfest.local').replace(/\/+$/, '');
    return `${siteUrl}/admin/index.html?checkin=1&ticketToken=${encodeURIComponent(token)}`;
  }

  private extractTokenFromText(raw: string | undefined): string {
    const text = String(raw || '').trim();
    if (!text) return '';

    try {
      const asUrl = new URL(text);
      const queryToken = asUrl.searchParams.get('ticketToken') || asUrl.searchParams.get('token');
      if (queryToken) {
        return queryToken.trim();
      }
    } catch {
      // ignore non-url input
    }

    if (text.includes('.') && !text.includes(' ')) {
      return text;
    }

    return '';
  }

  private parseTicketCodeFromInput(code: string | undefined): string {
    const raw = String(code || '').trim();
    if (!raw) return '';

    try {
      const asUrl = new URL(raw);
      const fromQuery = asUrl.searchParams.get('ticketCode') || asUrl.searchParams.get('code');
      if (fromQuery) return fromQuery.trim();
      return '';
    } catch {
      return raw;
    }
  }

  private async findApprovedRegistrationByTicketCode(
    ticketCode: string,
    eventId?: number,
  ): Promise<RegistrationRecord | null> {
    const where = eventId
      ? {
          eventId,
          note: { contains: ticketCode },
        }
      : {
          note: { contains: ticketCode },
        };

    const candidates = await this.prisma.registration.findMany({
      where,
      take: 120,
      orderBy: { updatedAt: 'desc' },
    });

    for (const candidate of candidates) {
      const parsed = this.parseRegistrationNote(candidate.note);
      const status = this.resolveStatus(parsed.adminMeta);
      if (status === 'approved' && parsed.adminMeta.ticketCode === ticketCode) {
        return candidate as RegistrationRecord;
      }
    }

    return null;
  }

  private async resolveTicketLookup(
    eventId: number,
    payload: { code?: string; token?: string },
  ): Promise<TicketLookupResult> {
    const rawCode = this.parseTicketCodeFromInput(payload.code);
    const tokenCandidate = String(payload.token || '').trim() || this.extractTokenFromText(payload.code);

    if (!rawCode && !tokenCandidate) {
      return {
        kind: 'invalid',
        message: 'Vui long nhap ma ve hoac duong dan QR hop le.',
      };
    }

    if (tokenCandidate) {
      const tokenPayload = this.verifyTicketToken(tokenCandidate);
      if (!tokenPayload) {
        return {
          kind: 'invalid',
          message: 'Token ve khong hop le hoac da het han.',
        };
      }

      if (tokenPayload.eventId !== eventId) {
        return {
          kind: 'wrong_event',
          message: 'Ve nay khong thuoc su kien hien tai.',
        };
      }

      const registration = await this.prisma.registration.findFirst({
        where: {
          id: tokenPayload.registrationId,
          eventId,
        },
      });

      if (!registration) {
        return {
          kind: 'invalid',
          message: 'Khong tim thay thong tin ve.',
        };
      }

      const parsed = this.parseRegistrationNote(registration.note);
      const status = this.resolveStatus(parsed.adminMeta);
      const ticketCode = parsed.adminMeta.ticketCode || '';
      if (status !== 'approved' || ticketCode !== tokenPayload.ticketCode) {
        return {
          kind: 'invalid',
          message: 'Ve khong hop le hoac chua duoc duyet.',
        };
      }

      return {
        kind: 'ok',
        registration: registration as RegistrationRecord,
        parsed,
        ticketCode,
      };
    }

    if (rawCode) {
      const registration = await this.findApprovedRegistrationByTicketCode(rawCode, eventId);
      if (registration) {
        const parsed = this.parseRegistrationNote(registration.note);
        return {
          kind: 'ok',
          registration,
          parsed,
          ticketCode: rawCode,
        };
      }

      const otherEventRegistration = await this.findApprovedRegistrationByTicketCode(rawCode);
      if (otherEventRegistration && otherEventRegistration.eventId !== eventId) {
        return {
          kind: 'wrong_event',
          message: 'Ve nay khong thuoc su kien hien tai.',
        };
      }
    }

    return {
      kind: 'invalid',
      message: 'Ma ve khong ton tai hoac khong hop le.',
    };
  }

  private getPage(value: number | undefined): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(Number(value)));
  }

  private getPageSize(value: number | undefined): number | null {
    if (!Number.isFinite(value)) return null;
    return Math.max(1, Math.min(500, Math.floor(Number(value))));
  }

  private async applyAdminUpdate(
    registration: RegistrationRecord,
    event: { id: number; title: string },
    payload: {
      status?: RegistrationStatus;
      priority?: boolean;
      sendEmail?: boolean;
      reason?: string;
    },
  ) {
    const parsed = this.parseRegistrationNote(registration.note);
    const currentStatus = this.resolveStatus(parsed.adminMeta);
    const nextStatus = payload.status || currentStatus;
    const nextPriority =
      typeof payload.priority === 'boolean' ? payload.priority : Boolean(parsed.adminMeta.priority);

    let ticketCode = parsed.adminMeta.ticketCode || '';
    let emailSentAt = parsed.adminMeta.emailSentAt || '';
    let emailResult: { sent: boolean; message: string } | null = null;
    const nextCheckedIn = nextStatus === 'approved' ? Boolean(registration.checkedIn) : false;

    if (nextStatus === 'approved' && payload.sendEmail) {
      ticketCode = ticketCode || this.generateTicketCode(event.id, registration.id);
      const ticketToken = this.createTicketToken({
        eventId: event.id,
        registrationId: registration.id,
        ticketCode,
      });
      const verifyUrl = this.buildTicketVerifyUrl(ticketToken);

      try {
        const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 260,
        });

        await this.sendApprovalTicketEmail({
          fullName: registration.fullName,
          email: registration.email,
          phone: registration.phone,
          eventTitle: event.title,
          ticketCode,
          verifyUrl,
          qrCodeDataUrl,
        });
        emailSentAt = new Date().toISOString();
        emailResult = {
          sent: true,
          message: 'Email ve dien tu da duoc gui thanh cong.',
        };
      } catch (error) {
        emailResult = {
          sent: false,
          message:
            error instanceof Error
              ? `Khong the gui email: ${error.message}`
              : 'Khong the gui email ve dien tu.',
        };
      }
    }

    const nextMeta: RegistrationAdminMeta = {
      status: nextStatus,
      priority: nextPriority,
      rejectedReason:
        nextStatus === 'rejected'
          ? (payload.reason || parsed.adminMeta.rejectedReason || '').trim()
          : undefined,
      ticketCode:
        nextStatus === 'approved' ? ticketCode || parsed.adminMeta.ticketCode : undefined,
      emailSentAt:
        nextStatus === 'approved' ? emailSentAt || parsed.adminMeta.emailSentAt : undefined,
      checkedInAt: nextCheckedIn ? parsed.adminMeta.checkedInAt : undefined,
      checkedInBy: nextCheckedIn ? parsed.adminMeta.checkedInBy : undefined,
      checkInGate: nextCheckedIn ? parsed.adminMeta.checkInGate : undefined,
    };

    const note = this.serializeRegistrationNote({
      plainNote: parsed.plainNote,
      adminMeta: nextMeta,
    });

    const updated = await this.prisma.registration.update({
      where: { id: registration.id },
      data: {
        checkedIn: nextCheckedIn,
        note,
        updatedAt: new Date(),
      },
    });

    return {
      ...this.toAdminRegistrationRow(updated as RegistrationRecord),
      emailResult,
    };
  }

  private async buildApprovalTicketEmailContent(payload: {
    fullName: string;
    email: string;
    phone: string;
    eventTitle: string;
    ticketCode: string;
    verifyUrl: string;
    qrCodeDataUrl: string;
  }) {
    const smtpUser = process.env.SMTP_USER;
    const fromAddress = process.env.SMTP_FROM || smtpUser || 'no-reply@huitfest.local';
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://huitfest.local';
    const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
    const ticketPortalUrl = process.env.TICKET_PORTAL_URL || 'https://huitfest.huitmedia.edu.vn/';
    const assetBaseUrl = (process.env.EMAIL_ASSET_BASE_URL || ticketPortalUrl || cleanSiteUrl).replace(/\/+$/, '');
    const logoUrl =
      process.env.EMAIL_LOGO_URL || `${assetBaseUrl}/assets/images/sponsors/1774771329898-38204467.webp`;
    const bannerUrl =
      process.env.EMAIL_BANNER_URL || `${assetBaseUrl}/assets/images/banner/1774848130318-606733103.webp`;
    const eventInfoUrl = process.env.EVENT_INFO_URL || ticketPortalUrl;
    const supportEmail = process.env.EVENT_SUPPORT_EMAIL || 'dovantuyendoan14@gmail.com';
    const supportPhone = process.env.EVENT_SUPPORT_PHONE || '0888854212';

    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const sentAt = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const eventDateTime = process.env.EVENT_DATETIME || '23-04-2025, 14:44';
    const eventLocation = process.env.EVENT_LOCATION || '1A PHOENIX';
    const ticketInfo = process.env.EVENT_TICKET_INFO || 'LA FONDE';
    const eventName = process.env.EVENT_DISPLAY_NAME || payload.eventTitle || 'HUFFEST 2025';

    // Keep this value read to preserve compatibility with previous call sites.
    const qrCodeDataUrl = payload.qrCodeDataUrl;
    const ticketPdfBuffer = await this.createTicketPdf({
      ticketCode: payload.ticketCode,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone || '',
      eventName,
      eventDateTime,
      eventLocation,
      ticketInfo,
      sentAt,
      verifyUrl: payload.verifyUrl,
      qrCodeDataUrl,
      supportEmail,
      supportPhone,
    });

    const subject = `[HUIT Media] Vé điện tử tham dự - ${eventName}`;
    const html = `
        <div style="margin:0;padding:0;background:#ececec;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ececec;padding:18px 0;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="420" style="width:420px;max-width:420px;background:#ffffff;color:#111827;">
                  <tr>
                    <td style="padding:12px 16px 8px;border-bottom:1px solid #d5d5d5;">
                      <img src="${logoUrl}" alt="HUIT Media" style="display:block;max-width:150px;height:auto;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 0;">
                      <div style="font-size:15px;font-weight:700;color:#111111;">Cảm ơn bạn, chúc bạn có nhiều niềm vui!</div>
                      <div style="font-size:11px;color:#4b5563;margin-top:2px;">Thank you, I wish fun with the show!</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 0;">
                      <img src="${bannerUrl}" alt="HUIT FEST Banner" style="display:block;width:100%;height:auto;border-radius:2px;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:11px;color:#111111;line-height:1.6;">
                        <tr>
                          <td style="width:45%;padding:2px 0;"><strong>Mã đặt chỗ</strong></td>
                          <td style="padding:2px 0;text-align:right;">#${payload.ticketCode}</td>
                        </tr>
                        <tr>
                          <td style="padding:2px 0;"><strong>Thời gian nhận vé</strong></td>
                          <td style="padding:2px 0;text-align:right;">${sentAt}</td>
                        </tr>
                        <tr>
                          <td style="padding:2px 0;"><strong>Thông tin người nhận vé</strong></td>
                          <td style="padding:2px 0;text-align:right;">${payload.fullName}</td>
                        </tr>
                        <tr>
                          <td style="padding:2px 0;"><strong>Tên sự kiện</strong></td>
                          <td style="padding:2px 0;text-align:right;">${eventName}</td>
                        </tr>
                        <tr>
                          <td style="padding:2px 0;"><strong>Ngày &amp; giờ</strong></td>
                          <td style="padding:2px 0;text-align:right;">${eventDateTime}</td>
                        </tr>
                        <tr>
                          <td style="padding:2px 0;"><strong>Địa điểm</strong></td>
                          <td style="padding:2px 0;text-align:right;">${eventLocation}</td>
                        </tr>
                        <tr>
                          <td style="padding:2px 0;"><strong>Thông tin vé</strong></td>
                          <td style="padding:2px 0;text-align:right;">${ticketInfo}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 0;">
                      <div style="background:#e7f8ed;border-left:4px solid #22c55e;padding:8px 10px;border-radius:4px;">
                        <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:6px;">Thông tin vé của bạn</div>
                        <div style="font-size:11px;color:#166534;line-height:1.55;">
                          Ticket của bạn đã được gửi vào email này. Bạn đang cầm vé điện tử này khi đến tham gia sự kiện.<br />
                          Ticket Information will be attached to this email. You can also view your ticket in the account section of Huit Media.
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:12px 16px 0;">
                      <a href="${eventInfoUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:10px 16px;border-radius:5px;">Thông tin sự kiện</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px 0;">
                      <div style="font-size:11px;color:#111111;line-height:1.5;">
                        Nếu nút bị lỗi trong một số thiết bị, bạn có thể copy và mở link bên dưới:<br />
                        <a href="${ticketPortalUrl}" style="color:#2563eb;word-break:break-all;">${ticketPortalUrl}</a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 16px 0;">
                      <div style="background:#dff7e8;border:1px solid #9be3b7;border-radius:4px;padding:8px 10px;font-size:11px;color:#166534;line-height:1.5;">
                        Không phải bản in vé! Vui lòng không in vé, hãy dùng điện thoại mở link này khi đến sự kiện.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px 16px;">
                      <div style="font-size:12px;font-weight:700;color:#111827;">Hỗ trợ</div>
                      <div style="font-size:11px;color:#374151;line-height:1.6;margin-top:5px;">
                        Email: ${supportEmail}<br />
                        SĐT: ${supportPhone}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `;

    const text = [
      `Xin chao ${payload.fullName},`,
      `Cam on ban da dang ky su kien ${eventName}.`,
      `Ma dat cho: #${payload.ticketCode}`,
      `Thoi gian nhan ve: ${sentAt}`,
      `Ngay gio su kien: ${eventDateTime}`,
      `Dia diem: ${eventLocation}`,
      `Thong tin ve: ${ticketInfo}`,
      `Thong tin su kien: ${eventInfoUrl}`,
      `Mo ve dien tu: ${ticketPortalUrl}`,
      `Ho tro: ${supportEmail} - ${supportPhone}`,
    ].join('\n');

    const attachmentFileName = `${payload.fullName || 'ticket'}-${payload.ticketCode}`
      .replace(/[^a-zA-Z0-9._-]/g, '_') + '.pdf';

    return {
      fromAddress,
      subject,
      html,
      text,
      ticketPdfBuffer,
      attachmentFileName,
    };
  }

  private async sendApprovalTicketEmail(payload: {
    fullName: string;
    email: string;
    phone: string;
    eventTitle: string;
    ticketCode: string;
    verifyUrl: string;
    qrCodeDataUrl: string;
  }) {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      throw new Error('SMTP_HOST is not configured');
    }

    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');

    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    const rendered = await this.buildApprovalTicketEmailContent(payload);

    await transport.sendMail({
      from: rendered.fromAddress,
      to: payload.email,
      subject: rendered.subject,
      attachments: [
        {
          filename: rendered.attachmentFileName,
          content: rendered.ticketPdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      html: rendered.html,
      text: rendered.text,
    });
  }

  private async buildTicketEmailPayloadForAdmin(registrationId: number) {
    const event = await this.eventService.getCurrentEvent();
    const registration = await this.prisma.registration.findFirst({
      where: {
        id: registrationId,
        eventId: event.id,
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    const parsed = this.parseRegistrationNote(registration.note);
    const ticketCode = parsed.adminMeta.ticketCode || this.generateTicketCode(event.id, registration.id);
    const ticketToken = this.createTicketToken({
      eventId: event.id,
      registrationId: registration.id,
      ticketCode,
    });
    const verifyUrl = this.buildTicketVerifyUrl(ticketToken);
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
    });

    return {
      event,
      registration: registration as RegistrationRecord,
      payload: {
        fullName: registration.fullName,
        email: registration.email,
        phone: registration.phone,
        eventTitle: event.title,
        ticketCode,
        verifyUrl,
        qrCodeDataUrl,
      },
    };
  }

  async previewTicketEmailForAdmin(id: number) {
    const prepared = await this.buildTicketEmailPayloadForAdmin(id);
    const rendered = await this.buildApprovalTicketEmailContent(prepared.payload);
    return {
      eventId: prepared.event.id,
      registrationId: prepared.registration.id,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      registration: this.toAdminRegistrationRow(prepared.registration),
    };
  }

  async previewTicketPdfForAdmin(id: number) {
    const prepared = await this.buildTicketEmailPayloadForAdmin(id);
    const rendered = await this.buildApprovalTicketEmailContent(prepared.payload);
    return {
      fileName: `${prepared.registration.id}-${prepared.payload.ticketCode}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_'),
      buffer: rendered.ticketPdfBuffer,
    };
  }

  async verifyTicketForAdmin(payload: VerifyTicketDto) {
    const event = await this.eventService.getCurrentEvent();
    const resolved = await this.resolveTicketLookup(event.id, payload);

    if (resolved.kind === 'wrong_event') {
      return {
        status: 'wrong_event',
        message: resolved.message,
      };
    }

    if (resolved.kind === 'invalid') {
      return {
        status: 'invalid',
        message: resolved.message,
      };
    }

    const item = this.toAdminRegistrationRow(resolved.registration);
    if (item.checkedIn) {
      return {
        status: 'already_checked_in',
        message: 'Ve da duoc check-in truoc do.',
        registration: item,
      };
    }

    return {
      status: 'valid_pending_checkin',
      message: 'Ve hop le. Co the xac nhan vao cong.',
      registration: item,
    };
  }

  async checkInTicketForAdmin(payload: CheckinTicketDto) {
    const event = await this.eventService.getCurrentEvent();
    const resolved = await this.resolveTicketLookup(event.id, payload);

    if (resolved.kind === 'wrong_event') {
      return {
        status: 'wrong_event',
        message: resolved.message,
      };
    }

    if (resolved.kind === 'invalid') {
      return {
        status: 'invalid',
        message: resolved.message,
      };
    }

    const existingRow = this.toAdminRegistrationRow(resolved.registration);
    if (existingRow.checkedIn) {
      return {
        status: 'already_checked_in',
        message: 'Ve nay da check-in truoc do.',
        registration: existingRow,
      };
    }

    const checkedInAt = new Date().toISOString();
    const checkedInBy = String(payload.checkedInBy || '').trim() || 'Staff';
    const checkInGate = String(payload.gateId || '').trim() || undefined;
    const nextMeta: RegistrationAdminMeta = {
      ...resolved.parsed.adminMeta,
      checkedInAt,
      checkedInBy,
      checkInGate,
    };

    const note = this.serializeRegistrationNote({
      plainNote: resolved.parsed.plainNote,
      adminMeta: nextMeta,
    });

    const updated = await this.prisma.registration.update({
      where: { id: resolved.registration.id },
      data: {
        checkedIn: true,
        note,
        updatedAt: new Date(),
      },
    });

    return {
      status: 'checked_in',
      message: 'Check-in thanh cong.',
      registration: this.toAdminRegistrationRow(updated as RegistrationRecord),
    };
  }

  async create(payload: CreateRegistrationDto) {
    const event = await this.eventService.getCurrentEvent();

    if (!event.registrationOpen) {
      throw new ConflictException('Registration is closed for this event');
    }

    const email = payload.email.toLowerCase().trim();
    const phone = payload.phone.replace(/\s+/g, '').trim();

    const duplicated = await this.prisma.registration.findFirst({
      where: {
        eventId: event.id,
        OR: [{ email }, { phone }],
      },
    });

    if (duplicated) {
      throw new ConflictException('Email or phone already registered for this event');
    }

    return this.prisma.registration.create({
      data: {
        eventId: event.id,
        fullName: payload.fullName.trim(),
        email,
        phone,
        school: payload.school?.trim(),
        province: payload.province?.trim(),
        role: payload.role?.trim(),
        major: payload.major?.trim(),
        campus: payload.campus?.trim(),
        updatedAt: new Date(),
      },
    });
  }

  async getStats() {
    const event = await this.eventService.getCurrentEvent();
    const registrations = await this.prisma.registration.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        note: true,
      },
    });

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const item of registrations) {
      const parsed = this.parseRegistrationNote(item.note);
      const status = this.resolveStatus(parsed.adminMeta);
      if (status === 'approved') {
        approved += 1;
      } else if (status === 'rejected') {
        rejected += 1;
      } else {
        pending += 1;
      }
    }

    return {
      eventId: event.id,
      eventTitle: event.title,
      totalRegistrations: registrations.length,
      pending,
      approved,
      rejected,
      registrationOpen: event.registrationOpen,
    };
  }

  async listForAdmin(query: AdminRegistrationQueryDto) {
    const event = await this.eventService.getCurrentEvent();
    const search = this.sanitizeSearchKeyword(query.search);
    const role = this.sanitizeSearchKeyword(query.role);
    const priority = this.parsePriorityFilter(query.priority);
    const page = this.getPage(query.page);
    const pageSize = this.getPageSize(query.pageSize);

    const registrations = await this.prisma.registration.findMany({
      where: {
        eventId: event.id,
        ...(role ? { role } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    let items = registrations.map((item) => this.toAdminRegistrationRow(item as RegistrationRecord));

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }
    if (priority !== undefined) {
      items = items.filter((item) => item.priority === priority);
    }

    items = items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority ? -1 : 1;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const counters = {
      total: items.length,
      pending: items.filter((item) => item.status === 'pending').length,
      approved: items.filter((item) => item.status === 'approved').length,
      rejected: items.filter((item) => item.status === 'rejected').length,
      priority: items.filter((item) => item.priority).length,
    };

    const totalItems = items.length;
    const totalPages = pageSize ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
    const currentPage = pageSize ? Math.min(page, totalPages) : 1;
    const pagedItems = pageSize
      ? items.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)
      : items;

    return {
      eventId: event.id,
      eventTitle: event.title,
      registrationOpen: !!event.registrationOpen,
      counters,
      items: pagedItems,
      pagination: {
        page: currentPage,
        pageSize: pageSize || totalItems,
        totalItems,
        totalPages,
        hasMore: pageSize ? currentPage < totalPages : false,
      },
    };
  }

  async getDetailForAdmin(id: number) {
    const event = await this.eventService.getCurrentEvent();
    const registration = await this.prisma.registration.findFirst({
      where: {
        id,
        eventId: event.id,
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    return {
      eventId: event.id,
      eventTitle: event.title,
      item: this.toAdminRegistrationRow(registration as RegistrationRecord),
    };
  }

  async updateForAdmin(id: number, payload: UpdateAdminRegistrationDto) {
    const event = await this.eventService.getCurrentEvent();
    const registration = await this.prisma.registration.findFirst({
      where: {
        id,
        eventId: event.id,
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    return this.applyAdminUpdate(registration as RegistrationRecord, event, {
      status: payload.status,
      priority: payload.priority,
      sendEmail: payload.sendEmail,
      reason: payload.reason,
    });
  }

  async bulkUpdateForAdmin(payload: BulkUpdateAdminRegistrationDto) {
    const event = await this.eventService.getCurrentEvent();
    const ids = Array.from(new Set((payload.ids || []).filter((id) => Number.isFinite(id))));

    if (ids.length === 0) {
      return {
        updatedCount: 0,
        failedCount: 0,
        items: [],
        failures: [],
      };
    }

    const registrations = await this.prisma.registration.findMany({
      where: {
        eventId: event.id,
        id: { in: ids },
      },
    });

    const byId = new Map<number, RegistrationRecord>();
    registrations.forEach((item) => {
      byId.set(item.id, item as RegistrationRecord);
    });

    const items = [] as Array<any>;
    const failures = [] as Array<{ id: number; message: string }>;

    for (const id of ids) {
      const registration = byId.get(id);
      if (!registration) {
        failures.push({ id, message: 'Registration not found' });
        continue;
      }

      try {
        const updated = await this.applyAdminUpdate(registration, event, {
          status: payload.status,
          priority: payload.priority,
          sendEmail: payload.sendEmail,
          reason: payload.reason,
        });
        items.push(updated);
      } catch (error) {
        failures.push({
          id,
          message: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }

    return {
      updatedCount: items.length,
      failedCount: failures.length,
      items,
      failures,
    };
  }

  async sendTicketEmailForAdmin(id: number) {
    const event = await this.eventService.getCurrentEvent();
    const registration = await this.prisma.registration.findFirst({
      where: {
        id,
        eventId: event.id,
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    const parsed = this.parseRegistrationNote(registration.note);
    const status = this.resolveStatus(parsed.adminMeta);
    if (status !== 'approved') {
      throw new ConflictException('Only approved registrations can receive ticket email');
    }

    return this.applyAdminUpdate(registration as RegistrationRecord, event, {
      status: 'approved',
      priority: Boolean(parsed.adminMeta.priority),
      sendEmail: true,
    });
  }

  async exportForAdmin(query: AdminRegistrationQueryDto) {
    const listing = await this.listForAdmin({
      ...query,
      page: undefined,
      pageSize: undefined,
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Ho ten', key: 'fullName', width: 24 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'So dien thoai', key: 'phone', width: 16 },
      { header: 'Doi tuong', key: 'audience', width: 18 },
      { header: 'THPT/MSSV', key: 'schoolOrStudentId', width: 24 },
      { header: 'Ngay sinh', key: 'birthDate', width: 16 },
      { header: 'Ma gioi thieu', key: 'referralCode', width: 18 },
      { header: 'Trang thai', key: 'status', width: 12 },
      { header: 'Uu tien', key: 'priority', width: 10 },
      { header: 'Ma ve', key: 'ticketCode', width: 18 },
      { header: 'Da check-in', key: 'checkedIn', width: 14 },
      { header: 'Check-in luc', key: 'checkedInAt', width: 22 },
      { header: 'Check-in boi', key: 'checkedInBy', width: 18 },
      { header: 'Cong check-in', key: 'checkInGate', width: 16 },
      { header: 'Da gui email luc', key: 'emailSentAt', width: 20 },
      { header: 'Ly do tu choi', key: 'rejectedReason', width: 26 },
      { header: 'Tao luc', key: 'createdAt', width: 20 },
      { header: 'Cap nhat luc', key: 'updatedAt', width: 20 },
    ];

    listing.items.forEach((item) => {
      worksheet.addRow({
        id: item.id,
        fullName: item.fullName,
        email: item.email,
        phone: item.phone,
        audience: item.audience,
        schoolOrStudentId: item.schoolOrStudentId,
        birthDate: item.birthDate,
        referralCode: item.referralCode,
        status: item.status,
        priority: item.priority ? 'Yes' : 'No',
        ticketCode: item.ticketCode,
        checkedIn: item.checkedIn ? 'Yes' : 'No',
        checkedInAt: this.formatDateTime(item.checkedInAt),
        checkedInBy: item.checkedInBy,
        checkInGate: item.checkInGate,
        emailSentAt: this.formatDateTime(item.emailSentAt),
        rejectedReason: item.rejectedReason,
        createdAt: this.formatDateTime(item.createdAt),
        updatedAt: this.formatDateTime(item.updatedAt),
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const fileName = `registrations-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const output = await workbook.xlsx.writeBuffer();

    return {
      fileName,
      buffer: Buffer.isBuffer(output) ? output : Buffer.from(output),
    };
  }
}
