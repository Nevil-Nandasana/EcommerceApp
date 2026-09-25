/**
 * Speqtus Medical Ordering Platform — Production Logger Utility
 * Governed by AGENTS.md code standards.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, namespace: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${namespace}]: ${message}`;
  }

  debug(namespace: string, message: string, ...args: unknown[]): void {
    if (this.isDev) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', namespace, message), ...args);
    }
  }

  info(namespace: string, message: string, ...args: unknown[]): void {
    if (this.isDev) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('info', namespace, message), ...args);
    }
  }

  warn(namespace: string, message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage('warn', namespace, message), ...args);
  }

  error(namespace: string, message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(this.formatMessage('error', namespace, message), ...args);
  }
}

export const logger = new Logger();
