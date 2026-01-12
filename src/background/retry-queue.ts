/**
 * Retry Queue
 *
 * Handles failed jobs with exponential backoff
 * - Stores failed operations
 * - Retries with exponential backoff
 * - Tracks attempts and errors
 * - Dead-letter queue after max attempts
 */

import { CommunicationRouter } from '../comms/router';

export interface Job {
  id: string;
  type: 'send_message' | 'deploy_workflow' | 'api_call' | 'custom';
  payload: any;
  runAt: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetryQueueConfig {
  checkIntervalSeconds: number;
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  enableDeadLetterQueue: boolean;
}

export class RetryQueue {
  private db: any;
  private router: CommunicationRouter;
  private config: RetryQueueConfig;
  private processingInterval: NodeJS.Timer | null = null;

  constructor(
    dbClient: any,
    router: CommunicationRouter,
    config?: Partial<RetryQueueConfig>
  ) {
    this.db = dbClient;
    this.router = router;
    this.config = {
      checkIntervalSeconds: config?.checkIntervalSeconds || 30,
      maxAttempts: config?.maxAttempts || 5,
      initialDelayMs: config?.initialDelayMs || 2000,
      backoffMultiplier: config?.backoffMultiplier || 2,
      enableDeadLetterQueue: config?.enableDeadLetterQueue !== false,
    };

    this.ensureJobsTable();
  }

  /**
   * Ensure jobs table exists (simple implementation)
   */
  private async ensureJobsTable(): Promise<void> {
    try {
      // Try to query the table
      await this.db.from('retry_jobs').select('id').limit(1);
    } catch (error) {
      console.warn('retry_jobs table may not exist. Create it with:');
      console.warn(`
CREATE TABLE retry_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_retry_jobs_run_at ON retry_jobs(run_at) WHERE status = 'pending';
CREATE INDEX idx_retry_jobs_status ON retry_jobs(status);
      `);
    }
  }

  /**
   * Add job to retry queue
   */
  async enqueue(
    type: Job['type'],
    payload: any,
    options?: {
      runAt?: Date;
      maxAttempts?: number;
    }
  ): Promise<string> {
    const { data, error } = await this.db
      .from('retry_jobs')
      .insert({
        type,
        payload,
        run_at: options?.runAt || new Date(),
        max_attempts: options?.maxAttempts || this.config.maxAttempts,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to enqueue job: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Process pending jobs
   */
  async processPendingJobs(): Promise<void> {
    try {
      // Get jobs ready to run
      const { data: jobs, error } = await this.db
        .from('retry_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('run_at', new Date().toISOString())
        .limit(10);

      if (error) {
        console.error('Error fetching pending jobs:', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        return;
      }

      console.log(`Processing ${jobs.length} pending jobs`);

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error: any) {
      console.error('Error in processPendingJobs:', error);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: any): Promise<void> {
    try {
      // Mark as processing
      await this.db
        .from('retry_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id);

      // Execute the job based on type
      let success = false;
      let error: string | undefined;

      switch (job.type) {
        case 'send_message':
          ({ success, error } = await this.executeSendMessage(job.payload));
          break;

        case 'deploy_workflow':
          ({ success, error } = await this.executeDeployWorkflow(job.payload));
          break;

        case 'api_call':
          ({ success, error } = await this.executeApiCall(job.payload));
          break;

        case 'custom':
          ({ success, error } = await this.executeCustom(job.payload));
          break;

        default:
          error = `Unknown job type: ${job.type}`;
          break;
      }

      if (success) {
        // Job succeeded - mark as completed
        await this.db
          .from('retry_jobs')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        console.log(`Job ${job.id} completed successfully`);
      } else {
        // Job failed - retry or move to DLQ
        await this.handleJobFailure(job, error || 'Unknown error');
      }
    } catch (error: any) {
      console.error(`Error processing job ${job.id}:`, error);
      await this.handleJobFailure(job, error.message);
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(job: any, error: string): Promise<void> {
    const newAttempts = job.attempts + 1;

    if (newAttempts >= job.max_attempts) {
      // Max attempts reached - move to dead letter queue or mark as failed
      if (this.config.enableDeadLetterQueue) {
        await this.moveToDeadLetterQueue(job, error);
      } else {
        await this.db
          .from('retry_jobs')
          .update({
            status: 'failed',
            attempts: newAttempts,
            last_error: error,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }

      console.log(`Job ${job.id} failed permanently after ${newAttempts} attempts`);

      // Notify about permanent failure
      await this.notifyPermanentFailure(job, error);
    } else {
      // Schedule retry with exponential backoff
      const delayMs = this.calculateBackoff(newAttempts);
      const runAt = new Date(Date.now() + delayMs);

      await this.db
        .from('retry_jobs')
        .update({
          status: 'pending',
          attempts: newAttempts,
          last_error: error,
          run_at: runAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(
        `Job ${job.id} scheduled for retry ${newAttempts}/${job.max_attempts} in ${delayMs}ms`
      );
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempts: number): number {
    return (
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempts - 1)
    );
  }

  /**
   * Move job to dead letter queue
   */
  private async moveToDeadLetterQueue(job: any, error: string): Promise<void> {
    try {
      // Insert into DLQ table
      await this.db.from('dead_letter_queue').insert({
        original_job_id: job.id,
        type: job.type,
        payload: job.payload,
        attempts: job.attempts + 1,
        final_error: error,
        created_at: job.created_at,
        failed_at: new Date().toISOString(),
      });

      // Mark original job as failed
      await this.db
        .from('retry_jobs')
        .update({
          status: 'failed',
          attempts: job.attempts + 1,
          last_error: error,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`Job ${job.id} moved to dead letter queue`);
    } catch (dlqError: any) {
      console.error(`Error moving job to DLQ:`, dlqError);
    }
  }

  /**
   * Notify about permanent job failure
   */
  private async notifyPermanentFailure(job: any, error: string): Promise<void> {
    try {
      await this.router.routeNotification({
        severity: 'WARN',
        type: 'agent_alert',
        title: 'Job Failed Permanently',
        body: `Job ${job.id} (${job.type}) failed after ${job.attempts + 1} attempts.\n\nError: ${error}`,
        requiresApproval: false,
        meta: {
          job_id: job.id,
          job_type: job.type,
          attempts: job.attempts + 1,
          error,
        },
      });
    } catch (notifyError: any) {
      console.error('Error sending failure notification:', notifyError);
    }
  }

  /**
   * Execute send_message job
   */
  private async executeSendMessage(payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.router.routeNotification(payload);
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute deploy_workflow job
   */
  private async executeDeployWorkflow(payload: any): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement workflow deployment logic
    return {
      success: false,
      error: 'deploy_workflow not yet implemented',
    };
  }

  /**
   * Execute api_call job
   */
  private async executeApiCall(payload: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { url, method, headers, body } = payload;

      const response = await fetch(url, {
        method: method || 'GET',
        headers: headers || {},
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API call failed: ${response.status} ${response.statusText}`,
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute custom job
   */
  private async executeCustom(payload: any): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement custom job handler
    return {
      success: false,
      error: 'custom job handler not implemented',
    };
  }

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.processingInterval) {
      console.warn('Retry queue already started');
      return;
    }

    console.log(
      `Starting retry queue (checking every ${this.config.checkIntervalSeconds}s)`
    );

    // Process immediately
    this.processPendingJobs();

    // Then process periodically
    this.processingInterval = setInterval(() => {
      this.processPendingJobs();
    }, this.config.checkIntervalSeconds * 1000);
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Retry queue stopped');
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const { data } = await this.db
      .from('retry_jobs')
      .select('status')
      .throwOnError();

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    data?.forEach((row: any) => {
      stats[row.status as keyof typeof stats]++;
    });

    return stats;
  }
}

/**
 * Create retry queue
 */
export function createRetryQueue(
  dbClient: any,
  router: CommunicationRouter,
  config?: Partial<RetryQueueConfig>
): RetryQueue {
  return new RetryQueue(dbClient, router, config);
}
