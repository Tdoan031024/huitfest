import { Injectable, Logger } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';

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
        this.logger.debug('Session verification failed: missing username or exp');
        return null;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      if (parsed.exp <= nowSeconds) {
        this.logger.debug(`Session verification failed: token expired for ${parsed.username}`);
        return null;
      }

      return {
        username: parsed.username,
        exp: parsed.exp,
      };
    } catch (e) {
      this.logger.debug('Session verification failed: JSON parse error or invalid encoding');
      return null;
    }
  }

  extractSessionToken(request: any): string | null {
    // 00. Nắm thóp tuyệt đối: Lấy qua Query Parameter của URL (Không proxy nào chặn được)
    const queryToken = request.query?.admin_token;
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }

    // 0. Try Custom Header (bulletproof against pinggy/localtunnel proxies stripping Auth headers)
    const customHeader = request.headers?.['x-admin-token'];
    if (customHeader) {
      return Array.isArray(customHeader) ? customHeader[0] : customHeader;
    }

    // 1. Try from Authorization Header
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Try from Cookie Header
    const cookieHeader = request.headers?.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';');
    for (const chunk of cookies) {
      const [rawName, ...rawValueParts] = chunk.trim().split('=');
      if (!rawName || rawValueParts.length === 0) {
        continue;
      }

      if (rawName.trim() === this.cookieName) {
        return decodeURIComponent(rawValueParts.join('='));
      }
    }

    return null;
  }

  getCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      // If we are on an IP or tunneling we shouldn't set a domain as it can be picky
      // Just ensure secure is false for HTTP to allow cookies to save
      secure: false, 
      path: '/',
      maxAge: this.getSessionTtlSeconds() * 1000,
    };
  }

  getClearCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: false,
      path: '/',
    };
  }

  private getSessionTtlSeconds(): number {
    const ttl = Number(process.env.ADMIN_SESSION_TTL_SECONDS || '28800');
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 28800;
  }

  private isSecureCookieEnabled(): boolean {
    const explicit = String(process.env.ADMIN_COOKIE_SECURE || '').trim().toLowerCase();
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;

    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    return nodeEnv === 'production';
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
