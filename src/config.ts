import type { TelemetryOptions, ParsedDsn } from './types';

/**
 * Default configuration values
 */
export const DEFAULT_OPTIONS: Partial<TelemetryOptions> = {
  sampleRate: 1.0,
  maxBreadcrumbs: 100,
  debug: false,
  enableOfflineQueue: true,
  maxOfflineQueueSize: 500,
};

/**
 * Parse a DSN string into its components
 * Format: https://pk_live_xxx@irontelemetry.com
 */
export function parseDsn(dsn: string): ParsedDsn {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;

    if (!publicKey || !publicKey.startsWith('pk_')) {
      throw new Error('DSN must contain a valid public key starting with pk_');
    }

    const protocol = url.protocol.replace(':', '');
    const host = url.host;

    return {
      publicKey,
      host,
      protocol,
      apiBaseUrl: `${protocol}://${host}`,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('pk_')) {
      throw error;
    }
    throw new Error(`Invalid DSN format: ${dsn}`);
  }
}

/**
 * Validate and merge options with defaults
 */
export function resolveOptions(options: TelemetryOptions): Required<TelemetryOptions> & { parsedDsn: ParsedDsn } {
  const parsedDsn = parseDsn(options.dsn);

  return {
    dsn: options.dsn,
    environment: options.environment ?? 'production',
    appVersion: options.appVersion ?? '0.0.0',
    sampleRate: Math.max(0, Math.min(1, options.sampleRate ?? DEFAULT_OPTIONS.sampleRate!)),
    maxBreadcrumbs: options.maxBreadcrumbs ?? DEFAULT_OPTIONS.maxBreadcrumbs!,
    debug: options.debug ?? DEFAULT_OPTIONS.debug!,
    beforeSend: options.beforeSend ?? (() => true),
    enableOfflineQueue: options.enableOfflineQueue ?? DEFAULT_OPTIONS.enableOfflineQueue!,
    maxOfflineQueueSize: options.maxOfflineQueueSize ?? DEFAULT_OPTIONS.maxOfflineQueueSize!,
    apiBaseUrl: options.apiBaseUrl ?? parsedDsn.apiBaseUrl,
    parsedDsn,
  };
}

/**
 * Generate a unique event ID
 */
export function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}
