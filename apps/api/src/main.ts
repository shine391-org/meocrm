import * as express from 'express';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
/* istanbul ignore file */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);

  app.use('/webhooks', express.raw({ type: '*/*' }));

  const rawBodyBuffer = (
    req: express.Request & { rawBody?: string },
    _res: express.Response,
    buf: Buffer,
    encoding: BufferEncoding,
  ) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  };

  const rawLimit = configService.get<string>('WEBHOOK_MAX_BODY', '1mb');
  app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true, limit: rawLimit }));
  app.use(bodyParser.json({ verify: rawBodyBuffer, limit: rawLimit }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        value: false,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(
    configService.get<string>('PORT') ??
      configService.get<string>('API_PORT') ??
      2003,
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
