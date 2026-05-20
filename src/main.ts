import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { OutboxWorker } from './outbox/outbox.worker';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const outboxWorker = app.get(OutboxWorker);
  outboxWorker.start();

  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`
========================================
Time-Off Microservice Started
========================================
Environment : ${process.env.APP_ENV || 'development'}
Port        : ${port}
Database    : ${process.env.DATABASE_PATH || 'database.sqlite'}
========================================
`);
}

void bootstrap();
