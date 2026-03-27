import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.adminAuthService.extractSessionToken(request.headers.cookie);
    const session = token ? this.adminAuthService.verifySessionToken(token) : null;

    if (!session) {
      throw new UnauthorizedException('Admin authentication required');
    }

    return true;
  }
}
