import { randomUUID } from 'crypto';

export function createRequestCode(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return `REQ-${timestamp}-${random}`;
}

export function createIdempotencyKey(requestId: string): string {
  return `IDEMP-${requestId}-${randomUUID()}`;
}
