import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RateLimit = (limit: number, windowMs: number = 60 * 1000) => {
  return applyDecorators(
    SetMetadata('rateLimit', limit),
    SetMetadata('rateLimitWindow', windowMs),
  );
};

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private static clients = new Map<string, { count: number; resetTime: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    if (!handler) {
      return true;
    }

    const limit = this.reflector.get<number>('rateLimit', handler) || 100;
    const windowMs = this.reflector.get<number>('rateLimitWindow', handler) || 60 * 1000;

    const ip =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      (request.connection && request.connection.remoteAddress) ||
      'unknown';

    const route = request.route ? request.route.path : request.url;
    const clientKey = `${ip}:${route}`;

    const now = Date.now();
    const client = RateLimiterGuard.clients.get(clientKey);

    if (!client || now > client.resetTime) {
      RateLimiterGuard.clients.set(clientKey, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (client.count >= limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    client.count++;
    return true;
  }
}
