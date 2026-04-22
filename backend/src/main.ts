import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

import { AppModule } from './app.module';
import { AdminAuthService } from './auth/admin-auth.service';

function parseAllowedOrigins(): string[] {
  return String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Robustly find the directory containing frontend static assets.
 * Checks both ./frontend/public (run from root) and ../frontend/public (run from backend/).
 */
function getFrontendPublicPath(): string {
  const candidates = [
    join(process.cwd(), 'frontend', 'public'),
    join(process.cwd(), '..', 'frontend', 'public'),
  ];

  for (const candidate of candidates) {
    if (require('node:fs').existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to previous behavior if all else fails
  return join(process.cwd(), '..', 'frontend', 'public');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('App');
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const allowedOrigins = parseAllowedOrigins();

  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!isProduction) {
        callback(null, true);
        return;
      }

      // Allow server-to-server calls and non-browser clients with no origin.
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${requestOrigin}`));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // cPanel/Passenger may mount the app under /nodeapi. Strip this prefix so
  // Nest routes continue to work with the same controller paths.
  app.use((request: Request, _response: Response, next: NextFunction) => {
    const mountPrefix = '/nodeapi';
    if (request.url === mountPrefix || request.url.startsWith(`${mountPrefix}/`)) {
      (request as any).__basePrefix = mountPrefix;
      request.url = request.url.slice(mountPrefix.length) || '/';
    }
    next();
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // Tắt cái này để cho phép admin_token và các tham số proxy khác
    }),
  );

  const adminAuthService = app.get(AdminAuthService);
  const frontendPublic = getFrontendPublicPath();
  const adminRoot = join(frontendPublic, 'admin');

  if (isProduction) {
    logger.log(`CORS mode: production (${allowedOrigins.length} allowed origins)`);
  } else {
    logger.log('CORS mode: development (allow all origins)');
  }

  logger.log(`Frontend assets path: ${frontendPublic}`);
  logger.log(`Admin dashboard path: ${adminRoot}`);

  app.use('/admin', (request: Request, response: Response, next: NextFunction) => {
    const path = String(request.path || '').toLowerCase();

    // Allow static admin assets to load without session so browser navigation
    // does not fail with a generic "page couldn't load" screen.
    const isStaticAsset =
      path === '/login' ||
      path.startsWith('/login/') ||
      path.startsWith('/admin/login') ||
      path.startsWith('/_next/') ||
      path.startsWith('/assets/') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.json') ||
      path.endsWith('.webmanifest') ||
      path.endsWith('.map') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.webp') ||
      path.endsWith('.svg') ||
      path.endsWith('.ico') ||
      path.endsWith('.woff') ||
      path.endsWith('.woff2') ||
      path.endsWith('.ttf') ||
      path.endsWith('.eot') ||
      path.endsWith('.otf');

    if (isStaticAsset) {
      next();
      return;
    }

    const token = adminAuthService.extractSessionToken(request);
    const session = token ? adminAuthService.verifySessionToken(token) : null;

    if (session) {
      logger.debug(`Admin access granted to ${session.username} for ${request.path}`);
      next();
      return;
    }

    const acceptsHtml = (request.headers.accept || '').includes('text/html');
    const fetchDest = String(request.headers['sec-fetch-dest'] || '').toLowerCase();
    const fetchMode = String(request.headers['sec-fetch-mode'] || '').toLowerCase();
    const isPageNavigation =
      acceptsHtml ||
      fetchDest === 'document' ||
      fetchMode === 'navigate' ||
      request.path === '/' ||
      request.path === '/index.html';

    if (isPageNavigation) {
      const basePrefix = ((request as any).__basePrefix as string | undefined) || '';
      const loginUrl = `${basePrefix}/admin/login`;
      
      logger.log(`Redirecting unauthorized page navigation to login: ${request.path}`);
      
      response
        .status(200)
        .type('html')
        .send(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chuyển đến trang đăng nhập | HUIT Fest</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #0b1020;
        color: #e5e7eb;
      }
      .card {
        width: min(92vw, 420px);
        padding: 40px;
        border-radius: 20px;
        background: #131a2f;
        border: 1px solid #2a3558;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        animation: fadeIn 0.5s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .btn {
        display: inline-block;
        margin-top: 24px;
        padding: 12px 32px;
        background: #7c3aed;
        color: white;
        text-decoration: none;
        border-radius: 10px;
        font-weight: bold;
        transition: all 0.2s;
      }
      .btn:hover {
        background: #6d28d9;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1 style="margin:0 0 12px;font-size:24px;color:#fff;">Yêu cầu đăng nhập</h1>
      <p style="margin:0;opacity:0.8;font-size:16px;line-height:1.5;">Vui lòng đăng nhập tài khoản quản trị để tiếp tục quản lý sự kiện HUIT Fest.</p>
      <a href="${loginUrl}" class="btn">Đăng nhập tài khoản</a>
    </main>
    <script>
      // Automatically redirect after a small delay to avoid browser "reload loop" detection
      // and allow the user to see the helpful message.
      setTimeout(() => {
        window.location.replace(${JSON.stringify(loginUrl)});
      }, 1200);
    </script>
  </body>
</html>`);
      return;
    }

    logger.debug(`Unauthorized API request blocked: ${request.path}`);
    response.status(401).json({
      message: 'Unauthorized: login required for admin resources',
    });
  });

  app.use('/admin', express.static(adminRoot, { index: 'index.html' }));

  const port = Number(process.env.PORT || 3005);

  // Add a simple request logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.log(`${req.method} ${req.url}`);
    next();
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`Backend running at http://localhost:${port}`);
}

bootstrap();
