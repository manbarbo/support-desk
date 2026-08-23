import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './presentation/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('API_PORT') ?? 3001;
  const corsOrigin =
    configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  console.log(`API is running on port ${port}`);
  await app.listen(port);
}
bootstrap();
