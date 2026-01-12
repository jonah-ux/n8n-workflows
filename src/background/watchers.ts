/**
 * Watchers
 *
 * Monitor specific conditions and send alerts:
 * - Workflow execution failures (repeated)
 * - API rate limit responses
 * - Cost anomalies
 * - Performance degradation
 */

import { CommunicationRouter } from '../comms/router';

export interface WatcherConfig {
  checkIntervalMinutes: number;
  failureThreshold: number;
  rateLimitThreshold: number;
  costAnomalyThreshold: number;
}

export interface Incident {
  id: string;
  type: 'repeated_failures' | 'rate_limits' | 'cost_anomaly' | 'performance_degradation';
  severity: 'SEV1' | 'WARN' | 'INFO';
  title: string;
  description: string;
  metrics: Record<string, any>;
  created_at: Date;
  resolved_at?: Date;
}

export class Watchers {
  private db: any;
  private router: CommunicationRouter;
  private config: WatcherConfig;
  private checkInterval: NodeJS.Timer | null = null;

  constructor(
    dbClient: any,
    router: CommunicationRouter,
    config?: Partial<WatcherConfig>
  ) {
    this.db = dbClient;
    this.router = router;
    this.config = {
      checkIntervalMinutes: config?.checkIntervalMinutes || 5,
      failureThreshold: config?.failureThreshold || 3,
      rateLimitThreshold: config?.rateLimitThreshold || 10,
      costAnomalyThreshold: config?.costAnomalyThreshold || 200, // 200% of baseline
    };
  }

  /**
   * Run all watchers
   */
  async runWatchers(): Promise<void> {
    try {
      await Promise.all([
        this.watchRepeatedFailures(),
        this.watchRateLimits(),
        this.watchCostAnomalies(),
        this.watchPerformanceDegradation(),
      ]);
    } catch (error: any) {
      console.error('Error in watchers:', error);
    }
  }

  /**
   * Watch for repeated workflow failures
   */
  private async watchRepeatedFailures(): Promise<void> {
    try {
      // Get failures in last 30 minutes
      const { data: failures, error } = await this.db
        .from('agent_audit_log')
        .select('*')
        .eq('success', false)
        .gte('ts', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order('ts', { ascending: false });

      if (error) {
        console.error('Error fetching failures:', error);
        return;
      }

      if (!failures || failures.length === 0) {
        return;
      }

      // Group by action type
      const failuresByAction: Record<string, any[]> = {};

      failures.forEach((failure: any) => {
        const action = failure.action;
        if (!failuresByAction[action]) {
          failuresByAction[action] = [];
        }
        failuresByAction[action].push(failure);
      });

      // Check for repeated failures
      for (const [action, actionFailures] of Object.entries(failuresByAction)) {
        if (actionFailures.length >= this.config.failureThreshold) {
          await this.createIncident({
            type: 'repeated_failures',
            severity: 'WARN',
            title: `Repeated Failures: ${action}`,
            description: `${actionFailures.length} failures in last 30 minutes`,
            metrics: {
              action,
              failure_count: actionFailures.length,
              threshold: this.config.failureThreshold,
              recent_errors: actionFailures.slice(0, 3).map((f: any) => f.error),
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Error in watchRepeatedFailures:', error);
    }
  }

  /**
   * Watch for rate limit responses
   */
  private async watchRateLimits(): Promise<void> {
    try {
      // Check rate limit bucket usage
      const { data: buckets, error } = await this.db
        .from('rate_limit_buckets')
        .select('*')
        .gte('window_start', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching rate limit buckets:', error);
        return;
      }

      if (!buckets || buckets.length === 0) {
        return;
      }

      for (const bucket of buckets) {
        const maxAllowed =
          bucket.channel === 'salesmsg' ? 5 : 10;

        const usagePercent = (bucket.count / maxAllowed) * 100;

        if (usagePercent >= 80) {
          await this.createIncident({
            type: 'rate_limits',
            severity: usagePercent >= 100 ? 'WARN' : 'INFO',
            title: `Rate Limit Warning: ${bucket.channel}`,
            description: `${usagePercent.toFixed(0)}% of hourly limit used`,
            metrics: {
              channel: bucket.channel,
              count: bucket.count,
              max_allowed: maxAllowed,
              usage_percent: usagePercent,
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Error in watchRateLimits:', error);
    }
  }

  /**
   * Watch for cost anomalies
   */
  private async watchCostAnomalies(): Promise<void> {
    try {
      // Count external API calls in last hour vs baseline
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Current hour count
      const { data: currentHour, error: currentError } = await this.db
        .from('agent_audit_log')
        .select('id', { count: 'exact' })
        .in('action', ['send_salesmsg', 'send_telegram', 'api_call'])
        .gte('ts', oneHourAgo.toISOString());

      if (currentError) {
        console.error('Error fetching current hour data:', currentError);
        return;
      }

      const currentCount = currentHour?.length || 0;

      // Baseline: average count per hour over last day
      const { data: lastDay, error: baselineError } = await this.db
        .from('agent_audit_log')
        .select('id', { count: 'exact' })
        .in('action', ['send_salesmsg', 'send_telegram', 'api_call'])
        .gte('ts', oneDayAgo.toISOString())
        .lt('ts', oneHourAgo.toISOString());

      if (baselineError) {
        console.error('Error fetching baseline data:', baselineError);
        return;
      }

      const baselineCount = lastDay?.length || 0;
      const baselinePerHour = baselineCount / 23; // 23 hours in baseline

      if (baselinePerHour === 0) {
        return; // Not enough data
      }

      const increasePercent = ((currentCount - baselinePerHour) / baselinePerHour) * 100;

      if (increasePercent >= this.config.costAnomalyThreshold) {
        await this.createIncident({
          type: 'cost_anomaly',
          severity: increasePercent >= 500 ? 'WARN' : 'INFO',
          title: 'Cost Anomaly Detected',
          description: `API call volume ${increasePercent.toFixed(0)}% above baseline`,
          metrics: {
            current_hour_count: currentCount,
            baseline_per_hour: baselinePerHour.toFixed(1),
            increase_percent: increasePercent,
            threshold_percent: this.config.costAnomalyThreshold,
          },
        });
      }
    } catch (error: any) {
      console.error('Error in watchCostAnomalies:', error);
    }
  }

  /**
   * Watch for performance degradation
   */
  private async watchPerformanceDegradation(): Promise<void> {
    try {
      // Check database response times
      const measurements: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();

        await this.db
          .from('agent_controls')
          .select('id')
          .limit(1);

        measurements.push(Date.now() - start);
      }

      const avgResponseTime =
        measurements.reduce((sum, val) => sum + val, 0) / measurements.length;

      const maxResponseTime = Math.max(...measurements);

      if (avgResponseTime > 1000) {
        // 1 second average is concerning
        await this.createIncident({
          type: 'performance_degradation',
          severity: avgResponseTime > 5000 ? 'WARN' : 'INFO',
          title: 'Database Performance Degraded',
          description: `Average response time: ${avgResponseTime.toFixed(0)}ms`,
          metrics: {
            avg_response_time_ms: avgResponseTime,
            max_response_time_ms: maxResponseTime,
            measurements,
          },
        });
      }
    } catch (error: any) {
      console.error('Error in watchPerformanceDegradation:', error);
    }
  }

  /**
   * Create incident and send alert
   */
  private async createIncident(incident: Omit<Incident, 'id' | 'created_at'>): Promise<void> {
    try {
      // Check if similar incident exists recently
      const { data: existingIncidents, error } = await this.db
        .from('incidents')
        .select('*')
        .eq('type', incident.type)
        .is('resolved_at', null)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error checking existing incidents:', error);
      }

      // Don't create duplicate if one exists in last hour
      if (existingIncidents && existingIncidents.length > 0) {
        console.log(`Similar ${incident.type} incident already exists, skipping`);
        return;
      }

      // Create incident record
      const { data: created, error: createError } = await this.db
        .from('incidents')
        .insert({
          type: incident.type,
          severity: incident.severity,
          title: incident.title,
          description: incident.description,
          metrics: incident.metrics,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating incident:', createError);
      }

      // Send alert
      await this.router.routeNotification({
        severity: incident.severity,
        type: 'agent_alert',
        title: incident.title,
        body: `${incident.description}\n\n${this.formatMetrics(incident.metrics)}`,
        requiresApproval: false,
        meta: {
          incident_id: created?.id,
          incident_type: incident.type,
          ...incident.metrics,
        },
      });

      console.log(`Incident created: ${incident.type} - ${incident.title}`);
    } catch (error: any) {
      console.error('Error in createIncident:', error);
    }
  }

  /**
   * Format metrics for display
   */
  private formatMetrics(metrics: Record<string, any>): string {
    return Object.entries(metrics)
      .map(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const formattedValue =
          typeof value === 'number' && !Number.isInteger(value)
            ? value.toFixed(2)
            : value;
        return `• ${formattedKey}: ${formattedValue}`;
      })
      .join('\n');
  }

  /**
   * Start watchers
   */
  start(): void {
    if (this.checkInterval) {
      console.warn('Watchers already started');
      return;
    }

    console.log(`Starting watchers (checking every ${this.config.checkIntervalMinutes} minutes)`);

    // Run immediately
    this.runWatchers();

    // Then run periodically
    this.checkInterval = setInterval(() => {
      this.runWatchers();
    }, this.config.checkIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop watchers
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Watchers stopped');
    }
  }
}

/**
 * Create watchers
 */
export function createWatchers(
  dbClient: any,
  router: CommunicationRouter,
  config?: Partial<WatcherConfig>
): Watchers {
  return new Watchers(dbClient, router, config);
}
