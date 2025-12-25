/**
 * Severity levels for events
 */
export type SeverityLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

/**
 * Breadcrumb categories
 */
export type BreadcrumbCategory =
  | 'ui'
  | 'http'
  | 'navigation'
  | 'console'
  | 'auth'
  | 'business'
  | 'notification'
  | 'custom';

/**
 * A breadcrumb representing an event leading up to an error
 */
export interface Breadcrumb {
  /** Timestamp when the breadcrumb was created */
  timestamp: Date;
  /** Category of the breadcrumb */
  category: BreadcrumbCategory;
  /** Human-readable message */
  message: string;
  /** Severity level */
  level?: SeverityLevel;
  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * User information for context
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** Email address */
  email?: string;
  /** Display name */
  name?: string;
  /** Additional user data */
  data?: Record<string, unknown>;
}

/**
 * Exception/error information
 */
export interface ExceptionInfo {
  /** Exception type/class name */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace */
  stacktrace?: StackFrame[];
}

/**
 * Stack frame information
 */
export interface StackFrame {
  /** Function name */
  function?: string;
  /** File name */
  filename?: string;
  /** Line number */
  lineno?: number;
  /** Column number */
  colno?: number;
  /** Source context around the line */
  context?: string[];
}

/**
 * Event payload sent to the server
 */
export interface TelemetryEvent {
  /** Unique event ID */
  eventId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Severity level */
  level: SeverityLevel;
  /** Message */
  message?: string;
  /** Exception information */
  exception?: ExceptionInfo;
  /** User context */
  user?: User;
  /** Tags for categorization */
  tags: Record<string, string>;
  /** Extra contextual data */
  extra: Record<string, unknown>;
  /** Breadcrumbs leading up to this event */
  breadcrumbs: Breadcrumb[];
  /** Journey context if in a journey */
  journey?: JourneyContext;
  /** Environment name */
  environment?: string;
  /** Application version */
  appVersion?: string;
  /** Platform information */
  platform: PlatformInfo;
}

/**
 * Platform/runtime information
 */
export interface PlatformInfo {
  /** Platform name (browser, node, etc.) */
  name: string;
  /** Platform version */
  version?: string;
  /** Operating system */
  os?: string;
  /** Browser/runtime user agent */
  userAgent?: string;
}

/**
 * Journey context for tracking user flows
 */
export interface JourneyContext {
  /** Journey ID */
  journeyId: string;
  /** Journey name */
  name: string;
  /** Current step name */
  currentStep?: string;
  /** Journey start time */
  startedAt: Date;
  /** Journey metadata */
  metadata: Record<string, unknown>;
}

/**
 * Step within a journey
 */
export interface JourneyStep {
  /** Step name */
  name: string;
  /** Step category */
  category?: string;
  /** Step start time */
  startedAt: Date;
  /** Step end time */
  endedAt?: Date;
  /** Step status */
  status: 'in_progress' | 'completed' | 'failed';
  /** Step data */
  data: Record<string, unknown>;
}

/**
 * Options for initializing the SDK
 */
export interface TelemetryOptions {
  /**
   * Data Source Name (DSN) containing the public key
   * Format: https://pk_live_xxx@irontelemetry.com
   */
  dsn: string;

  /** Environment name (e.g., 'production', 'staging') */
  environment?: string;

  /** Application version */
  appVersion?: string;

  /** Sample rate for events (0.0 to 1.0) */
  sampleRate?: number;

  /** Maximum number of breadcrumbs to keep */
  maxBreadcrumbs?: number;

  /** Enable debug logging */
  debug?: boolean;

  /**
   * Hook called before sending an event
   * Return false to drop the event
   */
  beforeSend?: (event: TelemetryEvent) => boolean | TelemetryEvent;

  /** Enable offline queue for failed events */
  enableOfflineQueue?: boolean;

  /** Maximum size of the offline queue */
  maxOfflineQueueSize?: number;

  /** API base URL (defaults to parsed from DSN) */
  apiBaseUrl?: string;
}

/**
 * Parsed DSN components
 */
export interface ParsedDsn {
  /** Public key */
  publicKey: string;
  /** Host */
  host: string;
  /** Protocol (http or https) */
  protocol: string;
  /** Full API base URL */
  apiBaseUrl: string;
}

/**
 * Result of sending an event
 */
export interface SendResult {
  /** Whether the send was successful */
  success: boolean;
  /** Event ID if successful */
  eventId?: string;
  /** Error message if failed */
  error?: string;
  /** Whether the event was queued for retry */
  queued?: boolean;
}
