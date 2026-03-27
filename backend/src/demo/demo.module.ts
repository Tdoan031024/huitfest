import { Module } from '@nestjs/common';

import { RegistrationModule } from '../registration/registration.module';
import { DemoController } from './demo.controller';

@Module({
  imports: [RegistrationModule],
  controllers: [DemoController],
})
export class DemoModule {}
