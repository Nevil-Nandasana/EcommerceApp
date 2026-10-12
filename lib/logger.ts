/**
 * Speqtus Medical Ordering Platform — Production Logger & Sentry Error Monitoring
 * Governed by AGENTS.md code standards and Phase 5 T5.F.1 error reporting.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ParsedSentryDsn {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
  endpoint: string;
}

export interface SentryPlugin {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string, context?: Record<string, unknown>) => void;
}

const SENSITIVE_KEY_PATTERNS = [
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'auth',
  'jwt',
  'apikey',
  'anonkey',
  'servicerolekey',
  'password',
  'pass',
  'otp',
  'secret',
  'patient',
  'phi',
  'patient_name',
  'patientname',
  'medical_record',
  'diagnosis',
  'health_condition',
  'prescription',
  'patient_id',
];

const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_REGEX = /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g;
const URI_SECRET_REGEX = /(?:password|pass|secret|otp|token|auth)=[^&\s]+/gi;
const JSON_SECRET_REGEX =
  /"(password|token|access_token|refresh_token|secret|otp|patient_name|diagnosis|medical_record)"\s*:\s*"[^"]*"/gi;

/**
 * Generates a valid 32-character lowercase hexadecimal UUID string per Sentry protocol.
 */
export function generateSentryEventId(): string {
  let hex = '';
  for (let i = 0; i < 32; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

/**
 * Recursively scrubs doctor auth tokens, passwords, and patient health information.
 */
export function sanitizeLogData<T>(data: T, depth = 0): T {
  if (depth > 6) return '[MAX_DEPTH]' as unknown as T;
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data
      .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
      .replace(JWT_REGEX, '[REDACTED_JWT]')
      .replace(URI_SECRET_REGEX, (match) => {
        const key = match.split('=')[0];
        return `${key}=[REDACTED]`;
      })
      .replace(JSON_SECRET_REGEX, '"$1": "[REDACTED]"') as unknown as T;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }

  if (data instanceof Error) {
    const cleanMsg = (data.message || '')
      .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
      .replace(JWT_REGEX, '[REDACTED_JWT]')
      .replace(URI_SECRET_REGEX, (match) => {
        const key = match.split('=')[0];
        return `${key}=[REDACTED]`;
      });
    const sanitizedErr = new Error(cleanMsg);
    sanitizedErr.name = data.name;
    if (data.stack) {
      sanitizedErr.stack = data.stack
        .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
        .replace(JWT_REGEX, '[REDACTED_JWT]');
    }
    return sanitizedErr as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern));
      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeLogData(val, depth + 1);
      }
    }
    return result as unknown as T;
  }

  return data;
}

/**
 * Parses a standard Sentry DSN URL string into its components.
 */
export function parseSentryDsn(dsn: string | null | undefined): ParsedSentryDsn | null {
  if (!dsn || typeof dsn !== 'string') return null;
  try {
    const trimmed = dsn.trim();
    // Standard format: https://publicKey@host/projectId or https://publicKey:secret@host/projectId
    const match = trimmed.match(/^(https?):\/\/([^:@]+)(?::([^@]+))?@([^/]+)\/(\d+)\/?$/);
    if (!match) return null;
    const [, protocol, publicKey, , host, projectId] = match;
    return {
      protocol,
      publicKey,
      host,
      projectId,
      endpoint: `${protocol}://${host}/api/${projectId}/store/`,
    };
  } catch {
    return null;
  }
}

let activeSentryPlugin: SentryPlugin | null = null;

/**
 * Registers an optional pluggable Sentry client (e.g., from @sentry/react-native).
 */
export function setSentryPlugin(plugin: SentryPlugin | null): void {
  activeSentryPlugin = plugin;
}

/**
 * Low-level HTTP transport fallback to send exception to Sentry when DSN is configured.
 * Never throws — guarantees silent fallback when offline or during network issues.
 */
async function dispatchToSentryEndpoint(
  dsnInfo: ParsedSentryDsn,
  sanitizedError: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  if (typeof fetch !== 'function') return;

  try {
    const errObj =
      sanitizedError instanceof Error
        ? sanitizedError
        : new Error(typeof sanitizedError === 'string' ? sanitizedError : JSON.stringify(sanitizedError));

    const eventPayload = {
      event_id: generateSentryEventId(),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: 'error',
      logger: 'speqtus-logger',
      environment: process.env.NODE_ENV || 'production',
      exception: {
        values: [
          {
            type: errObj.name || 'Error',
            value: errObj.message,
            stacktrace: errObj.stack ? { frames: [{ filename: errObj.stack }] } : undefined,
          },
        ],
      },
      extra: context || {},
    };

    const sentryTimestamp = Math.floor(Date.now() / 1000);
    await fetch(dsnInfo.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=speqtus-logger/1.0.0, sentry_key=${dsnInfo.publicKey}, sentry_timestamp=${sentryTimestamp}`,
      },
      body: JSON.stringify(eventPayload),
    }).catch(() => {
      // Offline or network timeout — ignore cleanly without throwing
    });
  } catch {
    // Non-fatal safety trap
  }
}

/**
 * Pluggable error capture helper.
 * Sends unhandled errors to Sentry if EXPO_PUBLIC_SENTRY_DSN or a plugin is configured.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  const sanitized = sanitizeLogData(error);
  const sanitizedCtx = context ? (sanitizeLogData(context) as Record<string, unknown>) : undefined;

  if (activeSentryPlugin) {
    try {
      activeSentryPlugin.captureException(sanitized, sanitizedCtx);
      return;
    } catch {
      // Fall through to HTTP or console fallback
    }
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const parsedDsn = parseSentryDsn(dsn);
  if (parsedDsn) {
    // Fire-and-forget HTTP dispatch
    dispatchToSentryEndpoint(parsedDsn, sanitized, sanitizedCtx).catch(() => {});
  }
}

export function captureMessage(
  message: string,
  level: LogLevel = 'info',
  context?: Record<string, unknown>
): void {
  const sanitizedMsg = sanitizeLogData(message);
  const sanitizedCtx = context ? (sanitizeLogData(context) as Record<string, unknown>) : undefined;

  if (activeSentryPlugin) {
    try {
      activeSentryPlugin.captureMessage(sanitizedMsg, level, sanitizedCtx);
      return;
    } catch {
      // Fall through
    }
  }
}

class Logger {
  private isDev = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, namespace: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${namespace}]: ${message}`;
  }

  debug(first: string, second?: unknown, ...args: unknown[]): void {
    if (this.isDev) {
      const namespace = typeof second === 'string' ? first : 'App';
      const rawMsg = typeof second === 'string' ? second : first;
      const cleanMsg = typeof rawMsg === 'string' ? sanitizeLogData(rawMsg) : rawMsg;
      const extraArgs = typeof second === 'string' ? args : (second !== undefined ? [second, ...args] : args);
      const sanitized = sanitizeLogData(extraArgs);
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', namespace, String(cleanMsg)), ...sanitized);
    }
  }

  info(first: string, second?: unknown, ...args: unknown[]): void {
    if (this.isDev) {
      const namespace = typeof second === 'string' ? first : 'App';
      const rawMsg = typeof second === 'string' ? second : first;
      const cleanMsg = typeof rawMsg === 'string' ? sanitizeLogData(rawMsg) : rawMsg;
      const extraArgs = typeof second === 'string' ? args : (second !== undefined ? [second, ...args] : args);
      const sanitized = sanitizeLogData(extraArgs);
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('info', namespace, String(cleanMsg)), ...sanitized);
    }
  }

  warn(first: string, second?: unknown, ...args: unknown[]): void {
    const namespace = typeof second === 'string' ? first : 'App';
    const rawMsg = typeof second === 'string' ? second : first;
    const cleanMsg = typeof rawMsg === 'string' ? sanitizeLogData(rawMsg) : rawMsg;
    const extraArgs = typeof second === 'string' ? args : (second !== undefined ? [second, ...args] : args);
    const sanitized = sanitizeLogData(extraArgs);
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage('warn', namespace, String(cleanMsg)), ...sanitized);
  }

  error(first: string, second?: unknown, ...args: unknown[]): void {
    const namespace = typeof second === 'string' ? first : 'App';
    const rawMsg = typeof second === 'string' ? second : first;
    const cleanMsg = typeof rawMsg === 'string' ? sanitizeLogData(rawMsg) : rawMsg;
    const extraArgs = typeof second === 'string' ? args : (second !== undefined ? [second, ...args] : args);
    const sanitized = sanitizeLogData(extraArgs);
    // eslint-disable-next-line no-console
    console.error(this.formatMessage('error', namespace, String(cleanMsg)), ...sanitized);

    // Automatically route to Sentry capture if an Error is present
    const err = (extraArgs.find((a) => a instanceof Error) as Error) || new Error(`${namespace}: ${cleanMsg}`);
    captureException(err, { namespace, message: cleanMsg, args: sanitized });
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    captureException(error, context);
  }

  captureMessage(message: string, level: LogLevel = 'info', context?: Record<string, unknown>): void {
    captureMessage(message, level, context);
  }
}

export const logger = new Logger();
