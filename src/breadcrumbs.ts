import type { Breadcrumb, BreadcrumbCategory, SeverityLevel } from './types';

/**
 * Manages breadcrumbs for an SDK instance
 */
export class BreadcrumbManager {
  private readonly maxBreadcrumbs: number;
  private breadcrumbs: Breadcrumb[] = [];

  constructor(maxBreadcrumbs: number = 100) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  /**
   * Add a breadcrumb
   */
  add(
    message: string,
    category: BreadcrumbCategory = 'custom',
    level: SeverityLevel = 'info',
    data?: Record<string, unknown>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date(),
      category,
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Trim to max size
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Add a breadcrumb from a full Breadcrumb object
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'> & { timestamp?: Date }): void {
    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp ?? new Date(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Get all breadcrumbs
   */
  getAll(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear all breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
  }

  /**
   * Get the number of breadcrumbs
   */
  get count(): number {
    return this.breadcrumbs.length;
  }
}
