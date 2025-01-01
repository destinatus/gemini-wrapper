import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ApiKeyModule } from './api-key/api-key.module';
import { GeminiModule } from './gemini/gemini.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],
      serveStaticOptions: {
        index: ['admin.html']
      }
    }),
    ApiKeyModule,
    GeminiModule,
  ],
})
export class AppModule {}
