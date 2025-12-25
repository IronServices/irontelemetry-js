import type { TelemetryEvent, SendResult, ParsedDsn } from './types';

/**
 * HTTP transport for sending events to the server
 */
export class Transport {
  private readonly apiBaseUrl: string;
  private readonly publicKey: string;
  private readonly debug: boolean;

  constructor(parsedDsn: ParsedDsn, apiBaseUrl: string, debug: boolean = false) {
    this.apiBaseUrl = apiBaseUrl;
    this.publicKey = parsedDsn.publicKey;
    this.debug = debug;
  }

  /**
   * Send an event to the server
   */
  async send(event: TelemetryEvent): Promise<SendResult> {
    const url = `${this.apiBaseUrl}/api/v1/events`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Key': this.publicKey,
        },
        body: JSON.stringify(this.serializeEvent(event)),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (this.debug) {
          console.error('[IronTelemetry] Failed to send event:', response.status, errorText);
        }
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();

      if (this.debug) {
        console.log('[IronTelemetry] Event sent successfully:', event.eventId);
      }

      return {
        success: true,
        eventId: result.eventId ?? event.eventId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.debug) {
        console.error('[IronTelemetry] Failed to send event:', errorMessage);
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if the server is reachable
   */
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          'X-Public-Key': this.publicKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Serialize an event for sending
   */
  private serializeEvent(event: TelemetryEvent): Record<string, unknown> {
    return {
      eventId: event.eventId,
      timestamp: event.timestamp.toISOString(),
      level: event.level,
      message: event.message,
      exception: event.exception,
      user: event.user,
      tags: event.tags,
      extra: event.extra,
      breadcrumbs: event.breadcrumbs.map((b) => ({
        ...b,
        timestamp: b.timestamp.toISOString(),
      })),
      journey: event.journey
        ? {
            ...event.journey,
            startedAt: event.journey.startedAt.toISOString(),
          }
        : undefined,
      environment: event.environment,
      appVersion: event.appVersion,
      platform: event.platform,
    };
  }
}
