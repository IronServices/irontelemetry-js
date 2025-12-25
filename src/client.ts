import type {
  TelemetryOptions,
  TelemetryEvent,
  SeverityLevel,
  Breadcrumb,
  BreadcrumbCategory,
  User,
  PlatformInfo,
  ExceptionInfo,
  StackFrame,
  SendResult,
} from './types';
import { resolveOptions, generateEventId } from './config';
import { Transport } from './transport';
import { OfflineQueue } from './queue';
import { BreadcrumbManager } from './breadcrumbs';
import { Journey, JourneyScope, Step, StepScope } from './journey';

/**
 * Main IronTelemetry client class
 */
export class TelemetryClient {
  private readonly options: ReturnType<typeof resolveOptions>;
  private readonly transport: Transport;
  private readonly queue: OfflineQueue | null;
  private readonly breadcrumbs: BreadcrumbManager;

  private tags: Record<string, string> = {};
  private extra: Record<string, unknown> = {};
  private user?: User;
  private currentJourney?: Journey;
  private flushInterval?: ReturnType<typeof setInterval>;
  private isInitialized: boolean = false;

  constructor(options: TelemetryOptions) {
    this.options = resolveOptions(options);
    this.transport = new Transport(this.options.parsedDsn, this.options.apiBaseUrl, this.options.debug);
    this.queue = this.options.enableOfflineQueue
      ? new OfflineQueue(this.options.maxOfflineQueueSize, this.options.debug)
      : null;
    this.breadcrumbs = new BreadcrumbManager(this.options.maxBreadcrumbs);
    this.isInitialized = true;

    // Start flush interval for offline queue
    if (this.queue) {
      this.flushInterval = setInterval(() => this.processQueue(), 30000);
    }

    if (this.options.debug) {
      console.log('[IronTelemetry] Initialized with DSN:', this.options.dsn);
    }
  }

  /**
   * Capture an exception
   */
  async captureException(error: Error | unknown, extra?: Record<string, unknown>): Promise<SendResult> {
    const exception = this.parseException(error);
    const event = this.createEvent('error', exception.message, exception);

    if (extra) {
      event.extra = { ...event.extra, ...extra };
    }

    return this.sendEvent(event);
  }

  /**
   * Capture a message
   */
  async captureMessage(message: string, level: SeverityLevel = 'info'): Promise<SendResult> {
    const event = this.createEvent(level, message);
    return this.sendEvent(event);
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(
    message: string,
    category: BreadcrumbCategory = 'custom',
    level?: SeverityLevel,
    data?: Record<string, unknown>
  ): void;
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void;
  addBreadcrumb(
    messageOrBreadcrumb: string | Omit<Breadcrumb, 'timestamp'>,
    category?: BreadcrumbCategory,
    level?: SeverityLevel,
    data?: Record<string, unknown>
  ): void {
    if (typeof messageOrBreadcrumb === 'string') {
      this.breadcrumbs.add(messageOrBreadcrumb, category, level, data);
    } else {
      this.breadcrumbs.addBreadcrumb(messageOrBreadcrumb);
    }
  }

  /**
   * Set user context
   */
  setUser(id: string, email?: string, data?: Record<string, unknown>): void {
    this.user = { id, email, data };
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.user = undefined;
  }

  /**
   * Set a tag
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  /**
   * Set extra context
   */
  setExtra(key: string, value: unknown): void {
    this.extra[key] = value;
  }

  /**
   * Start a new journey
   */
  startJourney(name: string): JourneyScope {
    this.currentJourney = new Journey(name);

    // Copy user context to journey
    if (this.user) {
      this.currentJourney.setUser(this.user.id, this.user.email, this.user.data);
    }

    return new JourneyScope(this.currentJourney, () => {
      this.currentJourney = undefined;
    });
  }

  /**
   * Start a step in the current journey
   */
  startStep(name: string, category?: string): StepScope {
    if (!this.currentJourney) {
      throw new Error('No active journey. Call startJourney() first.');
    }

    const step = this.currentJourney.startStep(name, category);
    return new StepScope(step);
  }

  /**
   * Flush pending events
   */
  async flush(): Promise<void> {
    await this.processQueue();
  }

  /**
   * Close the client
   */
  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  /**
   * Create a telemetry event
   */
  private createEvent(
    level: SeverityLevel,
    message?: string,
    exception?: ExceptionInfo
  ): TelemetryEvent {
    const event: TelemetryEvent = {
      eventId: generateEventId(),
      timestamp: new Date(),
      level,
      message,
      exception,
      user: this.currentJourney?.getUser() ?? this.user,
      tags: { ...this.tags },
      extra: { ...this.extra },
      breadcrumbs: this.breadcrumbs.getAll(),
      journey: this.currentJourney?.getContext(),
      environment: this.options.environment,
      appVersion: this.options.appVersion,
      platform: this.getPlatformInfo(),
    };

    return event;
  }

  /**
   * Send an event
   */
  private async sendEvent(event: TelemetryEvent): Promise<SendResult> {
    // Check sample rate
    if (Math.random() > this.options.sampleRate) {
      if (this.options.debug) {
        console.log('[IronTelemetry] Event dropped due to sample rate');
      }
      return { success: true, eventId: event.eventId };
    }

    // Apply beforeSend hook
    const beforeSendResult = this.options.beforeSend(event);
    if (beforeSendResult === false) {
      if (this.options.debug) {
        console.log('[IronTelemetry] Event dropped by beforeSend hook');
      }
      return { success: true, eventId: event.eventId };
    }

    const eventToSend = beforeSendResult === true ? event : beforeSendResult;

    // Try to send
    const result = await this.transport.send(eventToSend);

    if (!result.success && this.queue) {
      this.queue.enqueue(eventToSend);
      return { ...result, queued: true };
    }

    return result;
  }

  /**
   * Process offline queue
   */
  private async processQueue(): Promise<void> {
    if (!this.queue || this.queue.isEmpty) {
      return;
    }

    const isOnline = await this.transport.isOnline();
    if (!isOnline) {
      return;
    }

    const events = this.queue.getAll();

    for (const event of events) {
      const result = await this.transport.send(event);
      if (result.success) {
        this.queue.remove(event.eventId);
      }
    }
  }

  /**
   * Parse an error into exception info
   */
  private parseException(error: Error | unknown): ExceptionInfo {
    if (error instanceof Error) {
      return {
        type: error.name || 'Error',
        message: error.message,
        stacktrace: this.parseStackTrace(error.stack),
      };
    }

    return {
      type: 'Error',
      message: String(error),
    };
  }

  /**
   * Parse a stack trace string into frames
   */
  private parseStackTrace(stack?: string): StackFrame[] | undefined {
    if (!stack) return undefined;

    const frames: StackFrame[] = [];
    const lines = stack.split('\n');

    for (const line of lines) {
      // Chrome/Node format: "    at functionName (filename:line:column)"
      const chromeMatch = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
      if (chromeMatch) {
        frames.push({
          function: chromeMatch[1] || '<anonymous>',
          filename: chromeMatch[2],
          lineno: parseInt(chromeMatch[3], 10),
          colno: parseInt(chromeMatch[4], 10),
        });
        continue;
      }

      // Firefox format: "functionName@filename:line:column"
      const firefoxMatch = line.match(/^(.*)@(.+?):(\d+):(\d+)$/);
      if (firefoxMatch) {
        frames.push({
          function: firefoxMatch[1] || '<anonymous>',
          filename: firefoxMatch[2],
          lineno: parseInt(firefoxMatch[3], 10),
          colno: parseInt(firefoxMatch[4], 10),
        });
      }
    }

    return frames.length > 0 ? frames : undefined;
  }

  /**
   * Get platform information
   */
  private getPlatformInfo(): PlatformInfo {
    // Check for browser environment
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return {
        name: 'browser',
        userAgent: navigator.userAgent,
      };
    }

    // Check for Node.js environment
    if (typeof process !== 'undefined' && process.versions?.node) {
      return {
        name: 'node',
        version: process.versions.node,
        os: process.platform,
      };
    }

    return {
      name: 'unknown',
    };
  }
}
