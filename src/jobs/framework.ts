/**
 * Job Framework
 *
 * Base class for all background jobs with safety checks and audit logging
 */

import { Database } from '../lib/database';
import { beforeAction, afterAction, checkJobsEnabled, isQuietHours, bypassesQuietHours } from '../lib/safety';

export interface JobConfig {
  name: string;
  intervalMinutes?: number;
  cronExpression?: string;
  enabled: boolean;
  respectQuietHours: boolean;
  severity?: string; // For determining if job bypasses quiet hours
}

export interface JobResult {
  success: boolean;
  error?: string;
  duration_ms?: number;
  data?: any;
  retryable?: boolean;
}

export abstract class Job {
  protected db: Database;
  protected config: JobConfig;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(db: Database, config: JobConfig) {
    this.db = db;
    this.config = config;
  }

  /**
   * Execute the job (implemented by subclasses)
   */
  protected abstract execute(): Promise<JobResult>;

  /**
   * Run the job with safety checks and audit logging
   */
  async run(): Promise<JobResult> {
    const startTime = Date.now();

    try {
      // Pre-execution safety checks
      const allowed = await this.beforeExecution();
      if (!allowed) {
        return {
          success: false,
          error: 'Job execution blocked by safety checks',
          duration_ms: Date.now() - startTime,
          retryable: false,
        };
      }

      // Execute the job
      const result = await this.execute();

      // Post-execution audit
      await this.afterExecution(result, Date.now() - startTime);

      return result;
    } catch (error: any) {
      const result: JobResult = {
        success: false,
        error: error.message,
        duration_ms: Date.now() - startTime,
        retryable: this.isRetryableError(error),
      };

      await this.afterExecution(result, Date.now() - startTime);

      return result;
    }
  }

  /**
   * Pre-execution safety checks
   */
  private async beforeExecution(): Promise<boolean> {
    // Check if job is enabled
    if (!this.config.enabled) {
      console.log(`[${this.config.name}] Job disabled in config`);
      return false;
    }

    // Check if jobs are enabled globally
    if (!(await checkJobsEnabled(this.db))) {
      console.log(`[${this.config.name}] Jobs disabled globally`);
      return false;
    }

    // Check quiet hours
    if (this.config.respectQuietHours && !bypassesQuietHours(this.config.severity || '')) {
      if (isQuietHours()) {
        console.log(`[${this.config.name}] Skipped due to quiet hours`);
        return false;
      }
    }

    // Universal safety check
    const safetyCheck = await beforeAction(this.db, this.config.name, 'system');
    if (!safetyCheck.allowed) {
      console.error(`[${this.config.name}] Blocked: ${safetyCheck.reason}`);
      return false;
    }

    return true;
  }

  /**
   * Post-execution audit
   */
  private async afterExecution(result: JobResult, duration_ms: number): Promise<void> {
    await afterAction(this.db, this.config.name, 'system', {
      success: result.success,
      error: result.error,
      duration_ms,
      output_data: result.data,
    });

    if (result.success) {
      console.log(`[${this.config.name}] Completed successfully in ${duration_ms}ms`);
    } else {
      console.error(`[${this.config.name}] Failed: ${result.error}`);
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, rate limits are retryable
    const retryablePatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'rate limit',
      'too many requests',
      '429',
      '503',
      '504',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return retryablePatterns.some((pattern) => errorMessage.includes(pattern.toLowerCase()));
  }

  /**
   * Start job on interval
   */
  start(): void {
    if (this.intervalHandle) {
      console.warn(`[${this.config.name}] Job already started`);
      return;
    }

    if (!this.config.intervalMinutes) {
      console.error(`[${this.config.name}] No interval configured`);
      return;
    }

    console.log(`[${this.config.name}] Starting job (interval: ${this.config.intervalMinutes} minutes)`);

    // Run immediately
    this.run();

    // Then run on interval
    this.intervalHandle = setInterval(
      () => {
        this.run();
      },
      this.config.intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop job
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log(`[${this.config.name}] Job stopped`);
    }
  }

  /**
   * Run once (for manual execution or testing)
   */
  async runOnce(): Promise<JobResult> {
    return this.run();
  }
}

/**
 * Job Registry
 */
export class JobRegistry {
  private jobs: Map<string, Job> = new Map();

  /**
   * Register a job
   */
  register(job: Job): void {
    this.jobs.set(job['config'].name, job);
  }

  /**
   * Start all jobs
   */
  startAll(): void {
    console.log(`Starting ${this.jobs.size} jobs...`);
    this.jobs.forEach((job) => job.start());
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    console.log(`Stopping ${this.jobs.size} jobs...`);
    this.jobs.forEach((job) => job.stop());
  }

  /**
   * Get job by name
   */
  get(name: string): Job | undefined {
    return this.jobs.get(name);
  }

  /**
   * Run job once by name
   */
  async runOnce(name: string): Promise<JobResult> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job not found: ${name}`);
    }
    return job.runOnce();
  }

  /**
   * List all registered jobs
   */
  list(): string[] {
    return Array.from(this.jobs.keys());
  }
}
