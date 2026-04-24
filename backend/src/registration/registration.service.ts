import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as nodemailer from 'nodemailer';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import * as sharpModule from 'sharp';
import { createHmac, timingSafeEqual } from 'crypto';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import * as http from 'http';
import * as https from 'https';
import { join } from 'path';

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
  birthDate: string | null;
  referralCode: string | null;
  userType: string | null;
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
      birthDate: registration.birthDate || '',
      referralCode: registration.referralCode || '',
      userType: registration.userType || '',
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
      // PDFKit does not support WebP. We use sharp to convert to PNG.
      const isWebP = buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
      
      // If it's not WebP, we still convert it to PNG to ensure compatibility and standard resolution
      // but we especially care about WebP.
      if (isWebP) {
        console.log('[PDF IMAGE] Detected WebP format. Converting to PNG for PDF compatibility...');
      }

      const sharp = sharpModule as any;
      const converter = (sharp.default || sharp);
      
      if (typeof converter !== 'function') {
        return buffer;
      }

      return await converter(buffer).png().toBuffer();
    } catch (err) {
      console.error('[PDF IMAGE NORMALIZE ERROR]:', err instanceof Error ? err.message : String(err));
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
    logoBuffer?: Buffer | null;
    bannerBuffer?: Buffer | null;
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
      join(process.cwd(), 'dist', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
      join(process.cwd(), '..', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
      'C:/Windows/Fonts/arial.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
      '/usr/share/fonts/TTF/DejaVuSans.ttf',
    ];
    const boldFontPathCandidates = [
      join(process.cwd(), 'assets', 'fonts', 'NotoSans-Bold.ttf'),
      join(process.cwd(), 'dist', 'assets', 'fonts', 'NotoSans-Bold.ttf'),
      join(process.cwd(), '..', 'assets', 'fonts', 'NotoSans-Bold.ttf'),
      'C:/Windows/Fonts/arialbd.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
      '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    ];
    const regularFontPath = regularFontPathCandidates.find((path) => existsSync(path));
    const boldFontPath = boldFontPathCandidates.find((path) => existsSync(path));
    
    if (!regularFontPath) {
      console.warn('[PDF] WARNING: No suitable regular font found for Vietnamese support. Falling back to Helvetica.');
    } else {
      console.log(`[PDF] Using regular font: ${regularFontPath}`);
    }

    const setRegular = () => doc.font(regularFontPath || 'Helvetica');
    const setBold = () => doc.font(boldFontPath || 'Helvetica-Bold');

    doc.rect(cardX, cardY, cardWidth, cardHeight).lineWidth(1).stroke('#d1d5db');

    // Use pre-loaded buffers if passed (e.g., from buildApprovalTicketEmailContent).
    // Fall back to filesystem search only when not provided.
    let logoBuffer: Buffer | null = payload.logoBuffer ?? null;
    let bannerBuffer: Buffer | null = payload.bannerBuffer ?? null;

    if (!logoBuffer) {
      const runtimeRoots = this.getRuntimeRoots();
      const logoPathCandidates = runtimeRoots.flatMap((rootPath) => [
        join(rootPath, 'frontend', 'public', 'assets', 'images', 'logo', 'logohuit.png'),
        join(rootPath, 'frontend', 'public', 'assets', 'images', 'logo', 'logohuit.jpg'),
        join(rootPath, 'frontend', 'public', 'assets', 'images', 'logo', 'logohuit.webp'),
      ]);
      logoBuffer = await this.readFirstAvailableBuffer(logoPathCandidates);
    }

    if (!logoBuffer) {
      const emailLogoUrl = process.env.EMAIL_LOGO_URL;
      if (emailLogoUrl) {
        logoBuffer = await this.downloadBufferFromUrl(emailLogoUrl);
      }
    }

    if (!bannerBuffer) {
      const runtimeRoots = this.getRuntimeRoots();
      const bannerPathCandidates = runtimeRoots.flatMap((rootPath) => [
        join(rootPath, 'frontend', 'public', 'assets', 'images', 'banner', 'banner.png'),
        join(rootPath, 'frontend', 'public', 'assets', 'images', 'banner', 'banner.webp'),
      ]);
      bannerBuffer = await this.readFirstAvailableBuffer(bannerPathCandidates);
    }

    console.log(`[PDF] logoBuffer: ${logoBuffer ? logoBuffer.length + ' bytes' : 'EMPTY'}`);
    console.log(`[PDF] bannerBuffer: ${bannerBuffer ? bannerBuffer.length + ' bytes' : 'EMPTY'}`);

    const qrBuffer = await this.normalizePdfImageBuffer(this.dataUrlToBuffer(payload.qrCodeDataUrl));
    logoBuffer = await this.normalizePdfImageBuffer(logoBuffer);
    bannerBuffer = await this.normalizePdfImageBuffer(bannerBuffer);

    // ── HEADER: Logo left | FANZONE title right ──────────────────────────────
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, leftX, contentY, { height: 40 });
      } catch (err) {
        console.error('[PDF IMAGE ERROR] Failed to render logo:', err.message);
        setBold().fontSize(16).fillColor('#111827').text('HUIT FEST', leftX, contentY + 6);
      }
    } else {
      setBold().fontSize(16).fillColor('#111827').text('HUIT FEST', leftX, contentY + 6);
    }

    // TICKET TYPE (top-right)
    setBold().fontSize(26).fillColor('#111827').text(truncate(payload.ticketInfo, 20).toUpperCase(), rightX, contentY, {
      width: rightWidth,
      lineBreak: false,
    });

    // Divider
    const dividerY = contentY + 48;
    doc.moveTo(leftX, dividerY).lineTo(contentX + contentWidth, dividerY).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // ── GREETING ────────────────────────────────────────────────────────────
    const greetY = dividerY + 10;
    setBold().fontSize(13).fillColor('#111827').text('Chúc bạn có thật nhiều niềm vui nhé!', leftX, greetY, { width: leftWidth });
    setRegular().fontSize(9).fillColor('#6b7280').text('Your ticket is ready. Have fun with the show!', leftX, greetY + 18, { width: leftWidth });

    // ── Mã vé / Số ghế (top-right below title) ──────────────────────────────
    const infoRightY = dividerY + 10;
    const labelCol = 60;
    // Mã vé
    setBold().fontSize(9).fillColor('#111827').text('Mã vé', rightX, infoRightY);
    setRegular().fontSize(8).fillColor('#9ca3af').text('Ticket code', rightX, infoRightY + 11);
    setRegular().fontSize(10).fillColor('#111827').text(truncate(payload.ticketCode, 24), rightX + labelCol, infoRightY, {
      width: rightWidth - labelCol,
      align: 'right',
      lineBreak: false,
    });
    doc.moveTo(rightX, infoRightY + 22).lineTo(rightX + rightWidth, infoRightY + 22).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    // Số ghế
    setBold().fontSize(9).fillColor('#111827').text('Số ghế', rightX, infoRightY + 28);
    setRegular().fontSize(8).fillColor('#9ca3af').text('Seat code', rightX, infoRightY + 39);
    setRegular().fontSize(10).fillColor('#111827').text(truncate(payload.ticketInfo, 24), rightX + labelCol, infoRightY + 28, {
      width: rightWidth - labelCol,
      align: 'right',
      lineBreak: false,
    });
    doc.moveTo(rightX, infoRightY + 50).lineTo(rightX + rightWidth, infoRightY + 50).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    // ── LEFT: Banner image ────────────────────────────────────────────────
    const bannerY = greetY + 40;
    const bannerH = 116;
    if (bannerBuffer) {
      try {
        doc.image(bannerBuffer, leftX, bannerY, { width: leftWidth, height: bannerH });
      } catch (err) {
        console.error('[PDF IMAGE ERROR] Failed to render banner:', err.message);
        doc.rect(leftX, bannerY, leftWidth, bannerH).fill('#e5e7eb');
      }
    } else {
      doc.rect(leftX, bannerY, leftWidth, bannerH).fill('#e5e7eb');
    }

    // ── LEFT: Event name & info rows ─────────────────────────────────────
    const titleY = bannerY + bannerH + 10;
    setBold().fontSize(15).fillColor('#111827').text(truncate(payload.eventName, 32), leftX, titleY, {
      width: leftWidth,
      lineBreak: false,
    });

    // Date + Location (below event name, smaller)
    setRegular().fontSize(9).fillColor('#4b5563')
      .text(truncate(payload.eventDateTime, 38), leftX, titleY + 20, { width: leftWidth })
      .text(truncate(payload.eventLocation, 60), leftX, titleY + 32, { width: leftWidth });

    doc.moveTo(leftX, titleY + 52).lineTo(leftX + leftWidth, titleY + 52).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    // Draw bilingual rows (label Viet / sub English / value right)
    let rowY = titleY + 58;
    const rowH = 28;

    const drawBiRow = (labelVi: string, labelEn: string, value: string) => {
      setBold().fontSize(9).fillColor('#111827').text(labelVi, leftX, rowY, { width: 110, lineBreak: false });
      setRegular().fontSize(7.5).fillColor('#9ca3af').text(labelEn, leftX, rowY + 11, { width: 110, lineBreak: false });
      setRegular().fontSize(9).fillColor('#111827').text(value, leftX + 114, rowY + 4, {
        width: leftWidth - 114,
        align: 'right',
        lineBreak: false,
      });
      doc.moveTo(leftX, rowY + rowH).lineTo(leftX + leftWidth, rowY + rowH).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      rowY += rowH;
    };

    drawBiRow('Tên khách hàng', 'Customer', truncate(payload.fullName, 28));
    drawBiRow('Địa chỉ thư điện tử', 'Email', truncate(payload.email, 32));
    drawBiRow('Số điện thoại', 'Phone Number', truncate(payload.phone || '-', 18));

    // ── LEFT: Note box ────────────────────────────────────────────────────
    const noteY = rowY + 8;
    const noteH = 58;
    doc.roundedRect(leftX, noteY, leftWidth, noteH, 4).fill('#f0fdf4');
    doc.roundedRect(leftX, noteY, leftWidth, noteH, 4).strokeColor('#86efac').lineWidth(0.8).stroke();
    setBold().fontSize(9).fillColor('#166534').text('Lưu ý của ban tổ chức', leftX + 8, noteY + 8);
    setRegular().fontSize(7.5).fillColor('#6b7280').text('Attention', leftX + 8, noteY + 19);
    setRegular().fontSize(8.5).fillColor('#166534').text(
      'Kh\u00f4ng ph\u00e2n bi\u1ec7t v\u1ecb tr\u00ed khi tham d\u1ef1 s\u1ef1 ki\u1ec7n',
      leftX + 8, noteY + 30,
      { width: leftWidth - 16 }
    );

    // ── RIGHT: QR Code (large) ─────────────────────────────────────────────
    const qrStartY = infoRightY + 60;
    const qrSize = rightWidth;
    if (qrBuffer) {
      try {
        doc.image(qrBuffer, rightX, qrStartY, { width: qrSize, height: qrSize });
      } catch {
        doc.rect(rightX, qrStartY, qrSize, qrSize).fill('#f3f4f6');
      }
    } else {
      doc.rect(rightX, qrStartY, qrSize, qrSize).fill('#f3f4f6');
    }

    // QR note
    const qrNoteY = qrStartY + qrSize + 8;
    setRegular().fontSize(8).fillColor('#6b7280')
      .text('M\u00e3 QR ch\u1ec9 \u0111\u01b0\u1ee3c check-in m\u1ed9t l\u1ea7n duy nh\u1ea5t. Vui l\u00f2ng b\u1ea3o m\u1eadt th\u00f4ng tin m\u00e3 QR tr\u00ean v\u00e9 c\u1ee7a m\u00ecnh.', rightX, qrNoteY, { width: rightWidth })
      .text('Each QR code can only be checked in once. Please keep your QR code secure.', rightX, qrNoteY + 20, { width: rightWidth });

    // ── RIGHT: Ghi chú ────────────────────────────────────────────────────
    const noteRightY = qrNoteY + 44;
    doc.moveTo(rightX, noteRightY - 4).lineTo(rightX + rightWidth, noteRightY - 4).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    setBold().fontSize(9).fillColor('#111827').text('Ghi ch\u00fa', rightX, noteRightY);
    setRegular().fontSize(7.5).fillColor('#9ca3af').text('Note', rightX, noteRightY + 11);
    setRegular().fontSize(8).fillColor('#6b7280').text(
      'V\u00e9 \u0111i\u1ec7n t\u1eed. Vui l\u00f2ng d\u00f9ng \u0111i\u1ec7n tho\u1ea1i m\u1edf link n\u00e0y khi \u0111\u1ebfn s\u1ef1 ki\u1ec7n.',
      rightX, noteRightY + 22, { width: rightWidth }
    );

    // ── RIGHT: Thông tin hỗ trợ ───────────────────────────────────────────
    const supportY = noteRightY + 52;
    doc.moveTo(rightX, supportY - 4).lineTo(rightX + rightWidth, supportY - 4).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    setBold().fontSize(9).fillColor('#111827').text('Th\u00f4ng tin h\u1ed7 tr\u1ee3', rightX, supportY);
    setRegular().fontSize(7.5).fillColor('#9ca3af').text('Support', rightX, supportY + 11);
    setRegular().fontSize(8.5).fillColor('#374151')
      .text(`Email: ${truncate(payload.supportEmail, 38)}`, rightX, supportY + 22, { width: rightWidth })
      .text(`Hotline: ${truncate(payload.supportPhone, 24)}`, rightX, supportY + 34, { width: rightWidth });

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
    return `${siteUrl}/admin?checkin=1&ticketToken=${encodeURIComponent(token)}`;
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

    if (raw.toLowerCase().startsWith('http')) {
      try {
        const asUrl = new URL(raw);
        const fromQuery = asUrl.searchParams.get('ticketCode') || asUrl.searchParams.get('code');
        if (fromQuery) return fromQuery.trim().replace(/^#/, '');
      } catch (e) {}
    }

    return raw.replace(/^#/, '');
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
        const qrCodeDataUrl = await QRCode.toDataURL(ticketCode, {
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

  private async buildApprovalTicketEmailContent(
    payload: {
      fullName: string;
      email: string;
      phone: string;
      eventTitle: string;
      ticketCode: string;
      verifyUrl: string;
      qrCodeDataUrl: string;
    },
    options: { isPreview?: boolean } = {},
  ) {
    const isPreview = options.isPreview || false;
    const settings = await this.prisma.sitesettings.findFirst();
    
    const smtpUser = settings?.smtpUser || process.env.SMTP_USER;
    const fromAddress = settings?.smtpFrom || process.env.SMTP_FROM || smtpUser || 'no-reply@huitfest.local';
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://huitfest.local';
    const cleanSiteUrl = siteUrl.replace(/\/+$/, '');
    const ticketPortalUrl = settings?.ticketPortalUrl || process.env.TICKET_PORTAL_URL || cleanSiteUrl;
    // Helper: detect mime type from extension
    const guessMime = (url: string): string => {
      const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
      if (ext === 'png') return 'image/png';
      if (ext === 'gif') return 'image/gif';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'svg') return 'image/svg+xml';
      return 'image/jpeg';
    };

    // Helper: read image buffer from relative path (e.g. /assets/images/...)
    const readImageBuffer = async (relPath: string): Promise<Buffer | null> => {
      const cleanPath = relPath.replace(/^[\/]+/, '');
      const runtimeRoots = this.getRuntimeRoots();
      const candidates = runtimeRoots.flatMap((root) => [
        join(root, 'fe', 'public', cleanPath),
        join(root, 'frontend', 'public', cleanPath),
        join(root, 'public', cleanPath),
        join(root, cleanPath),
      ]);
      return this.readFirstAvailableBuffer(candidates);
    };

    // Helper: resolve image buffer (disk first, then HTTP download)
    const resolveImageBuffer = async (rawUrl: string | null | undefined): Promise<Buffer | null> => {
      if (!rawUrl) return null;
      if (rawUrl.startsWith('data:')) return null;

      // 1. Relative path → read from disk first
      if (!rawUrl.startsWith('http')) {
        const buf = await readImageBuffer(rawUrl);
        if (buf) return buf;
        
        // Fallback: try download from site's own public URL
        const siteUrl = (process.env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
        if (siteUrl) {
          const fullUrl = `${siteUrl}/${rawUrl.replace(/^[\/]+/, '')}`;
          console.log('[EMAIL IMAGE] Fallback downloading from site URL:', fullUrl);
          const dlBuf = await this.downloadBufferFromUrl(fullUrl);
          if (dlBuf) return dlBuf;
        }

        console.warn('[EMAIL IMAGE] Cannot read from disk or download from site:', rawUrl);
        return null;
      }

      // 2. Absolute URL → try pathname on disk first (optimization)
      try {
        const parsed = new URL(rawUrl);
        if (parsed.pathname && parsed.pathname !== '/') {
          const diskBuf = await readImageBuffer(parsed.pathname);
          if (diskBuf) {
            console.log('[EMAIL IMAGE] Loaded from disk (from absolute URL):', parsed.pathname);
            return diskBuf;
          }
        }
      } catch { /* ignore */ }

      // 3. Fallback: Download absolute URL
      console.log('[EMAIL IMAGE] Downloading absolute URL:', rawUrl);
      const buf = await this.downloadBufferFromUrl(rawUrl);
      if (buf) return buf;

      console.warn('[EMAIL IMAGE] Failed to load absolute URL:', rawUrl);
      return null;
    };

    // Determine source URLs for logo and banner
    const rawLogoUrl = settings?.ticketLogoUrl || process.env.EMAIL_LOGO_URL || `/assets/images/logo/logohuit.webp`;
    const rawBannerUrl = settings?.ticketBannerUrl || process.env.EMAIL_BANNER_URL || `/assets/images/banner/banner.webp`;

    // Load image buffers (will be attached as CID inline attachments in email)
    const logoBuffer = await resolveImageBuffer(rawLogoUrl);
    const bannerBuffer = await resolveImageBuffer(rawBannerUrl);

    console.log('[EMAIL IMAGE] logo buffer:', logoBuffer ? `${logoBuffer.length} bytes` : 'EMPTY');
    console.log('[EMAIL IMAGE] banner buffer:', bannerBuffer ? `${bannerBuffer.length} bytes` : 'EMPTY');

    // For preview in browser: use data URIs (data: URIs work in iframe/browser)
    const logoMime = guessMime(rawLogoUrl);
    const bannerMime = guessMime(rawBannerUrl);
    const logoDataUri = logoBuffer ? `data:${logoMime};base64,${logoBuffer.toString('base64')}` : '';
    const bannerDataUri = bannerBuffer ? `data:${bannerMime};base64,${bannerBuffer.toString('base64')}` : '';

    const eventInfoUrl = settings?.ticketInfoUrl || process.env.EVENT_INFO_URL || ticketPortalUrl;
    const supportEmail = settings?.ticketSupportEmail || process.env.EVENT_SUPPORT_EMAIL || 'dovantuyendoan14@gmail.com';
    const supportPhone = settings?.ticketSupportPhone || process.env.EVENT_SUPPORT_PHONE || '0888854212';

    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const sentAt = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const eventDateTime = settings?.ticketEventDateTime || process.env.EVENT_DATETIME || '23-04-2025, 14:44';
    const eventLocation = settings?.ticketEventLocation || process.env.EVENT_LOCATION || '1A PHOENIX';
    const ticketInfo = settings?.ticketInfo || process.env.EVENT_TICKET_INFO || 'LA FONDE';
    const eventName = settings?.ticketEventName || process.env.EVENT_DISPLAY_NAME || payload.eventTitle || 'HUFFEST 2025';

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
      logoBuffer,   // Truyền trực tiếp buffer đã tải thành công ở trên
      bannerBuffer, // Truyền trực tiếp buffer đã tải thành công ở trên
    });

    const subject = `[HUIT Media] Vé điện tử tham dự - ${eventName}`;
    const emailNoteMarkup = settings?.ticketEmailNote 
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:10px 12px;font-size:11px;color:#166534;line-height:1.5;margin-bottom:12px;">🔔 ${settings.ticketEmailNote}</div>`
      : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:10px 12px;font-size:11px;color:#166534;line-height:1.5;margin-bottom:12px;">🔔 Không phân biệt vị trí khi tham dự sự kiện. Vui lòng dùng điện thoại mở link này khi đến sự kiện.</div>`;

    const labels = {
      bookingCode: ['Mã đặt chỗ', 'Booking Code'],
      receivedAt: ['Thời gian nhận vé', 'Ticket collection time'],
      recipient: ['Thông tin người nhận vé', 'Recipient Information'],
      eventName: ['Tên sự kiện', 'Event Name'],
      dateTime: ['Ngày & giờ', 'Date & Time'],
      location: ['Địa điểm', 'Location'],
      ticketInfo: ['Thông tin vé', 'Ticket Info'],
    };

    const rowStyle = 'border-bottom:1px solid #f1f1f1;padding:10px 0;';
    const labelStyle = 'font-size:12px;font-weight:700;color:#111111;margin:0;line-height:1.2;';
    const subLabelStyle = 'font-size:10px;color:#6b7280;margin:0;font-weight:normal;line-height:1;margin-top:2px;';
    const valueStyle = 'font-size:12px;color:#111111;text-align:right;vertical-align:middle;padding-left:10px;';

    const renderRow = (label: string[], value: string) => `
      <tr>
        <td style="${rowStyle}" valign="top">
          <div style="${labelStyle}">${label[0]}</div>
          <div style="${subLabelStyle}">${label[1]}</div>
        </td>
        <td style="${rowStyle}${valueStyle}" align="right">${value}</td>
      </tr>
    `;

    const html = `
        <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:12px 0;">
            <tr>
              <td align="center" style="padding:0 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:480px;background:#ffffff;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.1);color:#111827;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="padding:20px;background:#ffffff;border-bottom:1px solid #f3f4f6;">
                      ${(logoBuffer && !isPreview)
                        ? `<img src="cid:ticket-logo@huitfest" alt="HUIT Media" style="display:block;max-width:160px;width:100%;height:auto;" />`
                        : (logoDataUri
                          ? `<img src="${logoDataUri}" alt="HUIT Media" style="display:block;max-width:160px;width:100%;height:auto;" />`
                          : `<span style="font-size:18px;font-weight:bold;color:#111827;">HUIT MEDIA</span>`)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0;">
                      ${(bannerBuffer && !isPreview)
                        ? `<img src="cid:ticket-banner@huitfest" alt="Event Banner" style="display:block;width:100%;height:auto;border:0;" />`
                        : (bannerDataUri
                          ? `<img src="${bannerDataUri}" alt="Event Banner" style="display:block;width:100%;height:auto;border:0;" />`
                          : '')}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 20px;">
                      <div style="font-size:18px;font-weight:700;color:#111827;margin-bottom:4px;line-height:1.2;">Thông tin vé điện tử của bạn</div>
                      <div style="font-size:13px;color:#6b7280;margin-bottom:20px;">Your Electronic Ticket Information</div>
                      
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                        ${renderRow(labels.bookingCode, `<strong style="color:#dc2626;font-size:14px;">#${payload.ticketCode}</strong>`)}
                        ${renderRow(labels.receivedAt, sentAt)}
                        ${renderRow(labels.recipient, payload.fullName)}
                        ${renderRow(labels.eventName, eventName)}
                        ${renderRow(labels.dateTime, eventDateTime)}
                        ${renderRow(labels.location, eventLocation)}
                        ${renderRow(labels.ticketInfo, ticketInfo)}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 12px;">
                       ${emailNoteMarkup}
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:12px 20px 24px;">
                      <a href="${eventInfoUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;padding:14px 28px;border-radius:8px;letter-spacing:0.5px;">XEM THÔNG TIN SỰ KIỆN</a>
                      <div style="margin-top:16px;font-size:11px;line-height:1.5;color:#6b7280;">
                        Nếu nút không hoạt động, bạn có thể sử dụng đường dẫn bên dưới:<br/>
                        <a href="${eventInfoUrl}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${eventInfoUrl}</a>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px;background:#f9fafb;border-top:1px solid #f3f4f6;">
                      <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:8px;">Hỗ trợ / Support</div>
                      <div style="font-size:12px;color:#4b5563;line-height:1.6;">
                        Email: <strong style="color:#111827;">${supportEmail}</strong><br />
                        Hotline: <strong style="color:#111827;">${supportPhone}</strong>
                      </div>
                    </td>
                  </tr>
                </table>
                <div style="padding:20px;text-align:center;font-size:11px;color:#9ca3af;">
                    &copy; 2026 HUIT Fest. All rights reserved.
                </div>
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
      // Raw buffers for CID inline attachment when sending real email
      logoBuffer,
      bannerBuffer,
      logoMime,
      bannerMime,
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
    const settings = await this.prisma.sitesettings.findFirst();

    const smtpHost = settings?.smtpHost || process.env.SMTP_HOST;
    if (!smtpHost) {
      throw new Error('SMTP_HOST is not configured in Settings or .env');
    }

    const smtpPort = settings?.smtpPort || Number(process.env.SMTP_PORT || 587);
    const smtpSecure = settings?.smtpPort === 465 || String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const smtpUser = settings?.smtpUser || process.env.SMTP_USER;
    const smtpPass = (settings?.smtpPass || String(process.env.SMTP_PASS || '')).replace(/\s+/g, '');

    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    const rendered = await this.buildApprovalTicketEmailContent(payload);

    // Build inline image attachments (CID) — the ONLY way to embed images that works in Gmail/Outlook
    const inlineAttachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
      cid: string;
    }> = [];

    if (rendered.logoBuffer) {
      inlineAttachments.push({
        filename: `logo.${rendered.logoMime.split('/')[1] || 'png'}`,
        content: rendered.logoBuffer,
        contentType: rendered.logoMime,
        cid: 'ticket-logo@huitfest',
      });
    }

    if (rendered.bannerBuffer) {
      inlineAttachments.push({
        filename: `banner.${rendered.bannerMime.split('/')[1] || 'png'}`,
        content: rendered.bannerBuffer,
        contentType: rendered.bannerMime,
        cid: 'ticket-banner@huitfest',
      });
    }

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
        ...inlineAttachments,
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
    const rendered = await this.buildApprovalTicketEmailContent(prepared.payload, { isPreview: true });
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
    console.log('[Checkin] Verify request body:', JSON.stringify(payload));
    const event = await this.eventService.getCurrentEvent();
    const resolved = await this.resolveTicketLookup(event.id, payload);
    console.log('[Checkin] Resolved lookup verify:', JSON.stringify({ kind: resolved.kind, ticketCode: (resolved as any).ticketCode }));

    if (resolved.kind === 'wrong_event') {
      throw new BadRequestException(resolved.message);
    }

    if (resolved.kind === 'invalid') {
      throw new BadRequestException(resolved.message);
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
      ticketCode: (resolved as any).ticketCode,
    };
  }

  async checkInTicketForAdmin(payload: CheckinTicketDto) {
    console.log('[Checkin] Confirm request body:', JSON.stringify(payload));
    const event = await this.eventService.getCurrentEvent();
    const resolved = await this.resolveTicketLookup(event.id, payload);
    console.log('[Checkin] Resolved lookup for confirm:', JSON.stringify({ kind: resolved.kind, ticketCode: (resolved as any).ticketCode }));

    if (resolved.kind === 'wrong_event') {
      throw new BadRequestException(resolved.message);
    }

    if (resolved.kind === 'invalid') {
      throw new BadRequestException(resolved.message);
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
      ticketCode: (resolved as any).ticketCode,
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
        birthDate: payload.birthDate?.trim(),
        referralCode: payload.referralCode?.trim(),
        userType: payload.userType?.trim(),
        school: payload.school?.trim(),
        province: payload.province?.trim(),
        role: payload.role?.trim(),
        major: (payload.studentId || payload.major)?.trim(),
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
