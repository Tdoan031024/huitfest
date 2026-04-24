import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AdminAuthModule } from './auth/admin-auth.module';
import { DemoModule } from './demo/demo.module';
import { EventModule } from './event/event.module';
import { PrismaModule } from './prisma.module';
import { RegistrationModule } from './registration/registration.module';
import { UploadModule } from './upload/upload.module';
import { BannerModule } from './banner/banner.module';
import { AboutModule } from './about/about.module';
import { SettingsModule } from './settings/settings.module';

const frontendPath = (() => {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, 'frontend', 'public'),
    join(cwd, '..', 'frontend', 'public'),
    join(cwd, 'public'),
  ];
  
  console.log('--- BACKEND PATH DEBUG ---');
  console.log('Current CWD:', cwd);
  
  for (const c of candidates) {
    const exists = require('fs').existsSync(c);
    console.log(`Checking path: ${c} -> ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    if (exists) return c;
  }
  
  const fallback = join(cwd, '..', 'frontend', 'public');
  console.log('Using fallback path:', fallback);
  return fallback;
})();

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: frontendPath,
      serveRoot: '/',
      exclude: ['/admin', '/admin/:path*', '/api', '/api/:path*'],
    }),
    AdminAuthModule,
    PrismaModule,
    DemoModule,
    EventModule,
    RegistrationModule,
    UploadModule,
    BannerModule,
    AboutModule,
    SettingsModule,
  ],
})
export class AppModule {}
