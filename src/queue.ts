import type { TelemetryEvent } from './types';

const STORAGE_KEY = 'irontelemetry_queue';

/**
 * Offline queue for storing events when the network is unavailable
 */
export class OfflineQueue {
  private readonly maxSize: number;
  private readonly debug: boolean;
  private queue: TelemetryEvent[] = [];

  constructor(maxSize: number = 500, debug: boolean = false) {
    this.maxSize = maxSize;
    this.debug = debug;
    this.load();
  }

  /**
   * Add an event to the queue
   */
  enqueue(event: TelemetryEvent): void {
    if (this.queue.length >= this.maxSize) {
      // Remove oldest events to make room
      this.queue.shift();
      if (this.debug) {
        console.log('[IronTelemetry] Queue full, dropping oldest event');
      }
    }

    this.queue.push(event);
    this.save();

    if (this.debug) {
      console.log('[IronTelemetry] Event queued, queue size:', this.queue.length);
    }
  }

  /**
   * Get all queued events
   */
  getAll(): TelemetryEvent[] {
    return [...this.queue];
  }

  /**
   * Remove an event from the queue
   */
  remove(eventId: string): void {
    this.queue = this.queue.filter((e) => e.eventId !== eventId);
    this.save();
  }

  /**
   * Clear all queued events
   */
  clear(): void {
    this.queue = [];
    this.save();
  }

  /**
   * Get the number of queued events
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is empty
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Load queue from persistent storage
   */
  private load(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          this.queue = parsed.map((e: Record<string, unknown>) => this.deserializeEvent(e));
        }
      }
    } catch (error) {
      if (this.debug) {
        console.error('[IronTelemetry] Failed to load queue from storage:', error);
      }
    }
  }

  /**
   * Save queue to persistent storage
   */
  private save(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch (error) {
      if (this.debug) {
        console.error('[IronTelemetry] Failed to save queue to storage:', error);
      }
    }
  }

  /**
   * Deserialize an event from storage
   */
  private deserializeEvent(data: Record<string, unknown>): TelemetryEvent {
    return {
      ...data,
      timestamp: new Date(data.timestamp as string),
      breadcrumbs: ((data.breadcrumbs as Record<string, unknown>[]) ?? []).map((b) => ({
        ...b,
        timestamp: new Date(b.timestamp as string),
      })),
      journey: data.journey
        ? {
            ...(data.journey as Record<string, unknown>),
            startedAt: new Date((data.journey as Record<string, unknown>).startedAt as string),
          }
        : undefined,
    } as TelemetryEvent;
  }
}
