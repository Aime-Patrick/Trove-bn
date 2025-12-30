import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as crypto from 'crypto';

// Polyfill for crypto global (required by @nestjs/schedule)
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = crypto;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Prefix
  app.setGlobalPrefix('api');

  // CORS - Configure based on environment
  const defaultOrigins = [
    'http://localhost:3000',    // Web dashboard (local)
    'http://localhost:19006',   // Expo Web (default port)
    'http://localhost:8081',    // Newer Expo/Metro port
  ];

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || defaultOrigins;

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true, // Allow all in development
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation with sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Trove API')
    .setDescription('The Trove Mobile App API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
