import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as nodemailer from 'nodemailer';

import { EventService } from '../event/event.service';
import { PrismaService } from '../prisma.service';
import { AdminRegistrationQueryDto } from './dto/admin-registration-query.dto';
import { BulkUpdateAdminRegistrationDto } from './dto/bulk-update-admin-registration.dto';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateAdminRegistrationDto } from './dto/update-admin-registration.dto';

type RegistrationStatus = 'pending' | 'approved' | 'rejected';

type RegistrationAdminMeta = {
  status?: RegistrationStatus;
  priority?: boolean;
  rejectedReason?: string;
  ticketCode?: string;
  emailSentAt?: string;
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
      Boolean(adminMeta.emailSentAt);

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

  private generateTicketCode(eventId: number, registrationId: number): string {
    const timestamp = Date.now().toString().slice(-6);
    return `HF${eventId}-${registrationId}-${timestamp}`;
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

    if (nextStatus === 'approved' && payload.sendEmail) {
      ticketCode = ticketCode || this.generateTicketCode(event.id, registration.id);
      try {
        await this.sendApprovalTicketEmail({
          fullName: registration.fullName,
          email: registration.email,
          eventTitle: event.title,
          ticketCode,
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
    };

    const note = this.serializeRegistrationNote({
      plainNote: parsed.plainNote,
      adminMeta: nextMeta,
    });

    const updated = await this.prisma.registration.update({
      where: { id: registration.id },
      data: {
        note,
        updatedAt: new Date(),
      },
    });

    return {
      ...this.toAdminRegistrationRow(updated as RegistrationRecord),
      emailResult,
    };
  }

  private async sendApprovalTicketEmail(payload: {
    fullName: string;
    email: string;
    eventTitle: string;
    ticketCode: string;
  }) {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      throw new Error('SMTP_HOST is not configured');
    }

    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number.isFinite(smtpPort) ? smtpPort : 587,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    const fromAddress = process.env.SMTP_FROM || smtpUser || 'no-reply@huitfest.local';
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://huitfest.local';

    await transport.sendMail({
      from: fromAddress,
      to: payload.email,
      subject: `[HUIT FEST] Ve tham du - ${payload.eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <h2 style="margin:0 0 10px;">Xin chao ${payload.fullName},</h2>
          <p>Dang ky tham gia <strong>${payload.eventTitle}</strong> cua ban da duoc duyet.</p>
          <p>Ma ve dien tu cua ban:</p>
          <p style="font-size:22px;font-weight:700;letter-spacing:1px;">${payload.ticketCode}</p>
          <p>Vui long mang ma ve nay khi tham gia su kien.</p>
          <p style="margin-top:16px;">Thong tin chuong trinh: <a href="${siteUrl}">${siteUrl}</a></p>
          <p>Cam on ban da dong hanh cung HUIT FEST.</p>
        </div>
      `,
      text: [
        `Xin chao ${payload.fullName},`,
        `Dang ky tham gia ${payload.eventTitle} cua ban da duoc duyet.`,
        `Ma ve dien tu: ${payload.ticketCode}`,
        `Thong tin chuong trinh: ${siteUrl}`,
      ].join('\n'),
    });
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
