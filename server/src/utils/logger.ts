type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level}]`;
  switch (level) {
    case 'ERROR':
      console.error(prefix, message, ...args);
      break;
    case 'WARN':
      console.warn(prefix, message, ...args);
      break;
    case 'DEBUG':
      console.debug(prefix, message, ...args);
      break;
    default:
      console.log(prefix, message, ...args);
  }
}

export const logger = {
  info: (message: string, ...args: unknown[]) => log('INFO', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('WARN', message, ...args),
  error: (message: string, ...args: unknown[]) => log('ERROR', message, ...args),
  debug: (message: string, ...args: unknown[]) => log('DEBUG', message, ...args),
};
