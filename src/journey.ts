import type { JourneyContext, JourneyStep, User } from './types';
import { generateEventId } from './config';

/**
 * Represents an active journey tracking session
 */
export class Journey {
  private readonly id: string;
  private readonly name: string;
  private readonly startedAt: Date;
  private metadata: Record<string, unknown> = {};
  private user?: User;
  private steps: JourneyStep[] = [];
  private currentStep?: JourneyStep;
  private _completed: boolean = false;
  private _failed: boolean = false;

  constructor(name: string) {
    this.id = generateEventId();
    this.name = name;
    this.startedAt = new Date();
  }

  /**
   * Set user context for this journey
   */
  setUser(id: string, email?: string, data?: Record<string, unknown>): this {
    this.user = { id, email, data };
    return this;
  }

  /**
   * Set metadata for this journey
   */
  setMetadata(key: string, value: unknown): this {
    this.metadata[key] = value;
    return this;
  }

  /**
   * Start a new step in this journey
   */
  startStep(name: string, category?: string): Step {
    // Complete any existing step
    if (this.currentStep && this.currentStep.status === 'in_progress') {
      this.currentStep.status = 'completed';
      this.currentStep.endedAt = new Date();
    }

    const step: JourneyStep = {
      name,
      category,
      startedAt: new Date(),
      status: 'in_progress',
      data: {},
    };

    this.steps.push(step);
    this.currentStep = step;

    return new Step(step, this);
  }

  /**
   * Mark the journey as completed
   */
  complete(): void {
    if (this.currentStep && this.currentStep.status === 'in_progress') {
      this.currentStep.status = 'completed';
      this.currentStep.endedAt = new Date();
    }
    this._completed = true;
  }

  /**
   * Mark the journey as failed
   */
  fail(): void {
    if (this.currentStep && this.currentStep.status === 'in_progress') {
      this.currentStep.status = 'failed';
      this.currentStep.endedAt = new Date();
    }
    this._failed = true;
  }

  /**
   * Get the journey context for an event
   */
  getContext(): JourneyContext {
    return {
      journeyId: this.id,
      name: this.name,
      currentStep: this.currentStep?.name,
      startedAt: this.startedAt,
      metadata: this.metadata,
    };
  }

  /**
   * Get the user context for this journey
   */
  getUser(): User | undefined {
    return this.user;
  }

  /**
   * Check if the journey is complete
   */
  get isComplete(): boolean {
    return this._completed || this._failed;
  }

  /**
   * Get journey ID
   */
  get journeyId(): string {
    return this.id;
  }
}

/**
 * Represents a step within a journey
 */
export class Step {
  private readonly step: JourneyStep;
  private readonly journey: Journey;

  constructor(step: JourneyStep, journey: Journey) {
    this.step = step;
    this.journey = journey;
  }

  /**
   * Set data for this step
   */
  setData(key: string, value: unknown): this {
    this.step.data[key] = value;
    return this;
  }

  /**
   * Mark the step as completed
   */
  complete(): void {
    this.step.status = 'completed';
    this.step.endedAt = new Date();
  }

  /**
   * Mark the step as failed
   */
  fail(): void {
    this.step.status = 'failed';
    this.step.endedAt = new Date();
  }

  /**
   * Get the step name
   */
  get name(): string {
    return this.step.name;
  }

  /**
   * Get the parent journey
   */
  getJourney(): Journey {
    return this.journey;
  }
}

/**
 * Journey scope that auto-completes on disposal
 */
export class JourneyScope {
  private readonly journey: Journey;
  private readonly onComplete?: () => void;

  constructor(journey: Journey, onComplete?: () => void) {
    this.journey = journey;
    this.onComplete = onComplete;
  }

  /**
   * Get the underlying journey
   */
  getJourney(): Journey {
    return this.journey;
  }

  /**
   * Dispose of the journey scope
   */
  [Symbol.dispose](): void {
    if (!this.journey.isComplete) {
      this.journey.complete();
    }
    this.onComplete?.();
  }
}

/**
 * Step scope that auto-completes on disposal
 */
export class StepScope {
  private readonly step: Step;

  constructor(step: Step) {
    this.step = step;
  }

  /**
   * Get the underlying step
   */
  getStep(): Step {
    return this.step;
  }

  /**
   * Set data on the step
   */
  setData(key: string, value: unknown): this {
    this.step.setData(key, value);
    return this;
  }

  /**
   * Dispose of the step scope
   */
  [Symbol.dispose](): void {
    if (this.step['step'].status === 'in_progress') {
      this.step.complete();
    }
  }
}
