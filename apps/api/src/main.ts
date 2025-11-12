import * as express from 'express';
import * as bodyParser from 'body-parser';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  createWebhookRawMiddleware,
  resolveApiPort,
  resolveWebhookRawLimit,
  WEBHOOK_RAW_BODY_DEFAULT,
} from './config/server.config';

const routeLogger = new Logger('RouteLogger');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const rawLimit = resolveWebhookRawLimit(configService, WEBHOOK_RAW_BODY_DEFAULT);

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

  app.use('/webhooks', createWebhookRawMiddleware(rawLimit));
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

  const port = resolveApiPort(configService);

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = corsOrigin
    ? corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : true,
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
  logRegisteredRoutes(app);
}
bootstrap();

function logRegisteredRoutes(app: INestApplication) {
  const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
  if (env !== 'development') {
    return;
  }

  try {
    const httpAdapter = app.getHttpAdapter?.();
    const instance = httpAdapter?.getInstance?.();
    const routerStack = instance?._router?.stack;
    if (!Array.isArray(routerStack)) {
      return;
    }

    const routes = routerStack
      .filter((layer) => layer?.route?.path)
      .map((layer) => {
        const methods = Object.entries(layer.route.methods ?? {})
          .filter(([, enabled]) => enabled)
          .map(([method]) => method.toUpperCase())
          .join('|');
        return `${methods || 'ALL'} ${layer.route.path}`;
      });

    if (routes.length) {
      routeLogger.debug(`Registered routes (${routes.length}):\n${routes.join('\n')}`);
    }
  } catch (error) {
    routeLogger.warn(
      `Route logging skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
