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
  const candidates = [
    join(process.cwd(), 'fe', 'public'),
    join(process.cwd(), '..', 'fe', 'public'),
  ];
  for (const c of candidates) {
    if (require('fs').existsSync(c)) return c;
  }
  return join(process.cwd(), '..', 'fe', 'public');
})();

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: frontendPath,
      serveRoot: '/',
      exclude: ['/admin*'],
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
