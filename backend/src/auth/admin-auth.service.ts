import { Injectable, Logger } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../prisma.service';

type AdminSessionPayload = {
  username: string;
  exp: number;
};

@Injectable()
export class AdminAuthService {
  readonly cookieName = 'huit_admin_session';

  private readonly logger = new Logger(AdminAuthService.name);
  private readonly defaultSessionSecret = 'change-me-secret';

  constructor(private readonly prismaService: PrismaService) {
    if (!process.env.ADMIN_SESSION_SECRET) {
      this.logger.warn(
        'Admin auth is using default session secret. Set ADMIN_SESSION_SECRET in .env for production.',
      );
    }
  }

  async validateCredentials(username: string, password: string): Promise<boolean> {
    const admin = await this.prismaService.adminuser.findUnique({
      where: { username },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      return false;
    }

    const isPasswordValid = await compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return false;
    }

    await this.prismaService.adminuser.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return true;
  }

  createSessionToken(username: string): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload: AdminSessionPayload = {
      username,
      exp: nowSeconds + this.getSessionTtlSeconds(),
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = this.sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  verifySessionToken(token: string): AdminSessionPayload | null {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 2) {
      return null;
    }

    const [encodedPayload, providedSignature] = tokenParts;
    const expectedSignature = this.sign(encodedPayload);
    if (!this.secureCompare(providedSignature, expectedSignature)) {
      return null;
    }

    try {
      const payloadText = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const parsed = JSON.parse(payloadText) as Partial<AdminSessionPayload>;
      if (typeof parsed.username !== 'string' || typeof parsed.exp !== 'number') {
        return null;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      if (parsed.exp <= nowSeconds) {
        return null;
      }

      return {
        username: parsed.username,
        exp: parsed.exp,
      };
    } catch {
      return null;
    }
  }

  extractSessionToken(cookieHeader?: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';');
    for (const chunk of cookies) {
      const [rawName, ...rawValueParts] = chunk.trim().split('=');
      if (!rawName || rawValueParts.length === 0) {
        continue;
      }

      if (rawName === this.cookieName) {
        return decodeURIComponent(rawValueParts.join('='));
      }
    }

    return null;
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: this.getSessionTtlSeconds() * 1000,
    };
  }

  getClearCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
  }

  private getSessionTtlSeconds(): number {
    const ttl = Number(process.env.ADMIN_SESSION_TTL_SECONDS || '28800');
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 28800;
  }

  private sign(value: string): string {
    const sessionSecret = process.env.ADMIN_SESSION_SECRET || this.defaultSessionSecret;
    return createHmac('sha256', sessionSecret).update(value).digest('base64url');
  }

  private secureCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, 'utf8');
    const bBuffer = Buffer.from(b, 'utf8');
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    return timingSafeEqual(aBuffer, bBuffer);
  }
}
