import * as winston from 'winston';
import 'winston-daily-rotate-file';

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined || value === null) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[Unserializable value]';
  }
}

function extractMetadata(
  info: winston.Logform.TransformableInfo,
): Record<string, unknown> {
  const excludedKeys = new Set(['timestamp', 'level', 'message', 'context']);

  return Object.fromEntries(
    Object.entries(info).filter(([key]) => !excludedKeys.has(key)),
  );
}

function createConsoleFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf((info) => {
      const timestamp = stringifyValue(info.timestamp);
      const level = stringifyValue(info.level);
      const message = stringifyValue(info.message);

      const context =
        typeof info.context === 'string'
          ? info.context
          : stringifyValue(info.context);

      const contextStr = context ? `[${context}]` : '';

      const metadata = extractMetadata(info);

      const metadataStr =
        Object.keys(metadata).length > 0 ? ` ${stringifyValue(metadata)}` : '';

      return `${timestamp} ${level} ${contextStr} ${message}${metadataStr}`;
    }),
  );
}

function createFileFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  );
}

export function createWinstonConfig(
  isProduction: boolean,
): winston.LoggerOptions {
  const level = isProduction ? 'info' : 'debug';

  const consoleTransport = new winston.transports.Console({
    format: createConsoleFormat(),
  });

  const transports: winston.transport[] = [consoleTransport];

  if (isProduction) {
    const fileFormat = createFileFormat();

    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
      }),

      new winston.transports.DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
      }),
    );
  }

  return {
    level,
    transports,
  };
}
