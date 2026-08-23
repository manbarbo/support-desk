import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from './winstonLogger.service';

describe('WinstonLoggerService', () => {
  let service: WinstonLoggerService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WinstonLoggerService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<WinstonLoggerService>(WinstonLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('debug', () => {
    it('should call logger.debug with message and metadata', () => {
      const spy = jest.spyOn(service['logger'], 'debug');

      service.debug('test message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('test message', { key: 'value' });
    });

    it('should call logger.debug with empty metadata when none provided', () => {
      const spy = jest.spyOn(service['logger'], 'debug');

      service.debug('test message');

      expect(spy).toHaveBeenCalledWith('test message', {});
    });
  });

  describe('info', () => {
    it('should call logger.info with message and metadata', () => {
      const spy = jest.spyOn(service['logger'], 'info');

      service.info('test message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('test message', { key: 'value' });
    });
  });

  describe('warn', () => {
    it('should call logger.warn with message and metadata', () => {
      const spy = jest.spyOn(service['logger'], 'warn');

      service.warn('test message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('test message', { key: 'value' });
    });
  });

  describe('error', () => {
    it('should call logger.error with message and metadata', () => {
      const spy = jest.spyOn(service['logger'], 'error');

      service.error('test message', { key: 'value' });

      expect(spy).toHaveBeenCalledWith('test message', { key: 'value' });
    });
  });

  describe('log', () => {
    it('should call logger.info (NestJS compatibility)', () => {
      const spy = jest.spyOn(service['logger'], 'info');

      service.log('test message');

      expect(spy).toHaveBeenCalledWith('test message', {});
    });
  });

  describe('production mode', () => {
    it('should use info level in production', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const prodService = new WinstonLoggerService(configService as any);

      expect(prodService['logger'].level).toBe('info');
    });

    it('should use debug level in development', () => {
      expect(service['logger'].level).toBe('debug');
    });
  });
});
