import { TelemetryClient } from './client';
import type {
  TelemetryOptions,
  TelemetryEvent,
  SeverityLevel,
  Breadcrumb,
  BreadcrumbCategory,
  User,
  SendResult,
} from './types';
import { JourneyScope, StepScope } from './journey';

// Export types
export type {
  TelemetryOptions,
  TelemetryEvent,
  SeverityLevel,
  Breadcrumb,
  BreadcrumbCategory,
  User,
  SendResult,
  ExceptionInfo,
  StackFrame,
  PlatformInfo,
  JourneyContext,
  JourneyStep,
  ParsedDsn,
} from './types';

// Export classes
export { TelemetryClient } from './client';
export { Journey, JourneyScope, Step, StepScope } from './journey';

// Global client instance
let globalClient: TelemetryClient | null = null;

/**
 * Initialize the global IronTelemetry client
 */
export function init(optionsOrDsn: TelemetryOptions | string): TelemetryClient {
  const options = typeof optionsOrDsn === 'string' ? { dsn: optionsOrDsn } : optionsOrDsn;
  globalClient = new TelemetryClient(options);
  return globalClient;
}

/**
 * Get the global client instance
 */
export function getClient(): TelemetryClient | null {
  return globalClient;
}

/**
 * Capture an exception using the global client
 */
export async function captureException(
  error: Error | unknown,
  extra?: Record<string, unknown>
): Promise<SendResult> {
  if (!globalClient) {
    console.warn('[IronTelemetry] Client not initialized. Call init() first.');
    return { success: false, error: 'Client not initialized' };
  }
  return globalClient.captureException(error, extra);
}

/**
 * Capture a message using the global client
 */
export async function captureMessage(
  message: string,
  level: SeverityLevel = 'info'
): Promise<SendResult> {
  if (!globalClient) {
    console.warn('[IronTelemetry] Client not initialized. Call init() first.');
    return { success: false, error: 'Client not initialized' };
  }
  return globalClient.captureMessage(message, level);
}

/**
 * Add a breadcrumb using the global client
 */
export function addBreadcrumb(
  message: string,
  category?: BreadcrumbCategory,
  level?: SeverityLevel,
  data?: Record<string, unknown>
): void;
export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void;
export function addBreadcrumb(
  messageOrBreadcrumb: string | Omit<Breadcrumb, 'timestamp'>,
  category?: BreadcrumbCategory,
  level?: SeverityLevel,
  data?: Record<string, unknown>
): void {
  if (!globalClient) {
    console.warn('[IronTelemetry] Client not initialized. Call init() first.');
    return;
  }

  if (typeof messageOrBreadcrumb === 'string') {
    globalClient.addBreadcrumb(messageOrBreadcrumb, category, level, data);
  } else {
    globalClient.addBreadcrumb(messageOrBreadcrumb);
  }
}

/**
 * Set user context using the global client
 */
export function setUser(id: string, email?: string, data?: Record<string, unknown>): void {
  if (!globalClient) {
    console.warn('[IronTelemetry] Client not initialized. Call init() first.');
    return;
  }
  globalClient.setUser(id, email, data);
}

/**
 * Clear user context using the global client
 */
export function clearUser(): void {
  if (!globalClient) {
    return;
  }
  globalClient.clearUser();
}

/**
 * Set a tag using the global client
 */
export function setTag(key: string, value: string): void {
  if (!globalClient) {
    console.warn('[IronTelemetry] Client not initialized. Call init() first.');
    return;
  }
  globalClient.setTag(key, value);
}

/**
 * Set extra context using the global client
 */
export function setExtra(key: string, value: unknown): void {
  if (!globalClient) {
    console.warn('[IronTelemetry] Client not initialized. Call init() first.');
    return;
  }
  globalClient.setExtra(key, value);
}

/**
 * Start a journey using the global client
 */
export function startJourney(name: string): JourneyScope {
  if (!globalClient) {
    throw new Error('[IronTelemetry] Client not initialized. Call init() first.');
  }
  return globalClient.startJourney(name);
}

/**
 * Start a step in the current journey using the global client
 */
export function startStep(name: string, category?: string): StepScope {
  if (!globalClient) {
    throw new Error('[IronTelemetry] Client not initialized. Call init() first.');
  }
  return globalClient.startStep(name, category);
}

/**
 * Flush pending events using the global client
 */
export async function flush(): Promise<void> {
  if (!globalClient) {
    return;
  }
  await globalClient.flush();
}

/**
 * Close the global client
 */
export function close(): void {
  if (globalClient) {
    globalClient.close();
    globalClient = null;
  }
}

// Default export for convenience
const IronTelemetry = {
  init,
  getClient,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  clearUser,
  setTag,
  setExtra,
  startJourney,
  startStep,
  flush,
  close,
};

export default IronTelemetry;

// Extension for Error prototype
declare global {
  interface Error {
    capture(): Error;
  }
}

/**
 * Capture this error and return it for re-throwing
 */
Error.prototype.capture = function (): Error {
  captureException(this);
  return this;
};

/**
 * Set up global unhandled exception handler
 */
export function useUnhandledExceptionHandler(): void {
  if (typeof window !== 'undefined') {
    // Browser
    window.addEventListener('error', (event) => {
      captureException(event.error ?? new Error(event.message));
    });

    window.addEventListener('unhandledrejection', (event) => {
      captureException(event.reason ?? new Error('Unhandled Promise rejection'));
    });
  } else if (typeof process !== 'undefined') {
    // Node.js
    process.on('uncaughtException', (error) => {
      captureException(error);
    });

    process.on('unhandledRejection', (reason) => {
      captureException(reason ?? new Error('Unhandled Promise rejection'));
    });
  }
}

/**
 * Track a step with automatic error handling
 */
export function trackStep<T>(name: string, fn: () => T, category?: string): T {
  if (!globalClient) {
    return fn();
  }

  const step = startStep(name, category);

  try {
    const result = fn();
    step[Symbol.dispose]();
    return result;
  } catch (error) {
    step.getStep().fail();
    throw error;
  }
}

/**
 * Track an async step with automatic error handling
 */
export async function trackStepAsync<T>(
  name: string,
  fn: () => Promise<T>,
  category?: string
): Promise<T> {
  if (!globalClient) {
    return fn();
  }

  const step = startStep(name, category);

  try {
    const result = await fn();
    step[Symbol.dispose]();
    return result;
  } catch (error) {
    step.getStep().fail();
    throw error;
  }
}
