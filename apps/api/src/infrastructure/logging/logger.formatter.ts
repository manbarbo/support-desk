export interface FormattedLog {
  message: string;
  metadata: Record<string, unknown>;
}

export function formatLog(
  message: string,
  metadata?: Record<string, unknown>,
): FormattedLog {
  const formattedMetadata = metadata ?? {};

  return {
    message,
    metadata: formattedMetadata,
  };
}

export function stringifyLogValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === undefined) {
    return '';
  }

  if (value === null) {
    return 'null';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[Unserializable value]';
  }
}
