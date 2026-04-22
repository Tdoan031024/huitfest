import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { RegistrationService } from './src/registration/registration.service';
import { PrismaService } from './src/prisma.service';

async function bootstrap() {
  console.log('Khởi tạo ứng dụng Test...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const registrationService = app.get(RegistrationService);
  const prisma = app.get(PrismaService);

  try {
    // Tìm record đăng ký đầu tiên có email để test
    let reg = await prisma.registration.findFirst({
      where: { email: { not: '' } }
    });

    if (!reg) {
      console.log('Không tìm thấy người đăng ký nào, tạo một đăng ký mẫu...');
      const event = await prisma.event.findFirst();
      if (!event) {
          throw new Error('Chưa có Event nào trong database!');
      }
      reg = await prisma.registration.create({
        data: {
          eventId: event.id,
          fullName: 'Test Email User',
          email: 'test-user@ethereal.email',
          phone: '0123456789',
        }
      });
    }

    console.log(`Đang chạy test gửi mail đến ID: ${reg.id} - ${reg.email}`);

    // Update status to approved if not already
    await registrationService.updateForAdmin(reg.id, {
        status: 'approved'
    });

    // Gọi hàm gửi email
    const result: any = await registrationService.sendTicketEmailForAdmin(reg.id);
    
    console.log('\n✅ TEST THÀNH CÔNG!');
    if (result && result.emailResult) {
      console.log(`Kết quả mail:`, result.emailResult);
    } else {
      console.log('Chi tiết result:', result);
    }

  } catch (error: any) {
    console.error('\n❌ TEST THẤT BẠI:');
    console.error(error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
