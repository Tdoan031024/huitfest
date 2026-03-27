import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';

import { AppController } from './app.controller';
import { AdminAuthModule } from './auth/admin-auth.module';
import { DemoModule } from './demo/demo.module';
import { EventModule } from './event/event.module';
import { PrismaModule } from './prisma.module';
import { RegistrationModule } from './registration/registration.module';
import { UploadModule } from './upload/upload.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), '..', 'frontend', 'public'),
      serveRoot: '/',
      exclude: ['/admin*'],
    }),
    AdminAuthModule,
    PrismaModule,
    DemoModule,
    EventModule,
    RegistrationModule,
    UploadModule,
  ],
})
export class AppModule {}
