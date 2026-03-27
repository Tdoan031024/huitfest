import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

import { AppModule } from './app.module';
import { AdminAuthService } from './auth/admin-auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const adminAuthService = app.get(AdminAuthService);
  const adminRoot = join(process.cwd(), '..', 'frontend', 'public', 'admin');

  app.use('/admin', (request: Request, response: Response, next: NextFunction) => {
    const token = adminAuthService.extractSessionToken(request.headers.cookie);
    const session = token ? adminAuthService.verifySessionToken(token) : null;

    if (session) {
      next();
      return;
    }

    const acceptsHtml = (request.headers.accept || '').includes('text/html');
    if (acceptsHtml) {
      response.redirect('/api/admin/auth/login-page');
      return;
    }

    response.status(401).json({
      message: 'Unauthorized: login required for admin resources',
    });
  });

  app.use('/admin', express.static(adminRoot, { index: 'index.html' }));

  const port = Number(process.env.PORT || 3000);
  const logger = new Logger('App');

  // Add a simple request logger
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.log(`${req.method} ${req.url}`);
    next();
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`Backend running at http://localhost:${port}`);
}

bootstrap();
