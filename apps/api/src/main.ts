import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = Number(
    configService.get<string>('PORT') ??
      configService.get<string>('API_PORT') ??
      2003,
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((origin) => origin.trim()) : true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('MeoCRM API')
    .setDescription('Multi-tenant CRM API for Vietnamese retail')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
