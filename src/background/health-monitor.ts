/**
 * Health Monitor
 *
 * Runs periodically to check system health and send alerts
 * - Checks n8n execution failures
 * - Checks database health
 * - Sends daily digests
 * - Sends immediate SEV1 alerts for critical issues
 */

import { CommunicationRouter } from '../comms/router';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'critical';
  details: string;
  metrics?: Record<string, any>;
}

export interface HealthMonitorConfig {
  checkIntervalMinutes: number;
  failureThreshold: number;
  performanceThreshold: number;
  enableDailyDigest: boolean;
  dailyDigestTime: string; // HH:MM format
}

export class HealthMonitor {
  private router: CommunicationRouter;
  private db: any;
  private config: HealthMonitorConfig;
  private lastDigestTime: number = 0;

  constructor(dbClient: any, router: CommunicationRouter, config?: Partial<HealthMonitorConfig>) {
    this.db = dbClient;
    this.router = router;
    this.config = {
      checkIntervalMinutes: config?.checkIntervalMinutes || 15,
      failureThreshold: config?.failureThreshold || 5,
      performanceThreshold: config?.performanceThreshold || 10000, // 10s
      enableDailyDigest: config?.enableDailyDigest !== false,
      dailyDigestTime: config?.dailyDigestTime || '09:00',
    };
  }

  /**
   * Run health checks
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    try {
      // Check 1: n8n workflow failures
      const workflowHealth = await this.checkWorkflowFailures();
      results.push(workflowHealth);

      // Check 2: Database health
      const dbHealth = await this.checkDatabaseHealth();
      results.push(dbHealth);

      // Check 3: Communication health
      const commsHealth = await this.checkCommunicationHealth();
      results.push(commsHealth);

      // Check 4: Agent controls status
      const controlsHealth = await this.checkAgentControls();
      results.push(controlsHealth);

      // Send alerts if needed
      await this.processHealthResults(results);

      // Send daily digest if it's time
      if (this.config.enableDailyDigest && this.shouldSendDailyDigest()) {
        await this.sendDailyDigest(results);
      }

      return results;
    } catch (error: any) {
      console.error('Error in health checks:', error);
      return results;
    }
  }

  /**
   * Check for workflow execution failures
   */
  private async checkWorkflowFailures(): Promise<HealthCheckResult> {
    try {
      // Query recent workflow failures
      const { data, error } = await this.db
        .from('agent_audit_log')
        .select('*')
        .eq('success', false)
        .gte('ts', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('ts', { ascending: false });

      if (error) {
        return {
          component: 'n8n_workflows',
          status: 'critical',
          details: `Database error: ${error.message}`,
        };
      }

      const failureCount = data?.length || 0;

      if (failureCount >= this.config.failureThreshold) {
        return {
          component: 'n8n_workflows',
          status: 'critical',
          details: `${failureCount} failures in last hour (threshold: ${this.config.failureThreshold})`,
          metrics: {
            failure_count: failureCount,
            threshold: this.config.failureThreshold,
          },
        };
      } else if (failureCount > 0) {
        return {
          component: 'n8n_workflows',
          status: 'degraded',
          details: `${failureCount} failures in last hour`,
          metrics: {
            failure_count: failureCount,
          },
        };
      }

      return {
        component: 'n8n_workflows',
        status: 'healthy',
        details: 'No recent failures',
        metrics: {
          failure_count: 0,
        },
      };
    } catch (error: any) {
      return {
        component: 'n8n_workflows',
        status: 'critical',
        details: `Health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();

      // Simple query to test database responsiveness
      const { data, error } = await this.db
        .from('agent_controls')
        .select('id')
        .limit(1);

      const duration = Date.now() - startTime;

      if (error) {
        return {
          component: 'database',
          status: 'critical',
          details: `Database error: ${error.message}`,
        };
      }

      if (duration > this.config.performanceThreshold) {
        return {
          component: 'database',
          status: 'degraded',
          details: `Slow response: ${duration}ms (threshold: ${this.config.performanceThreshold}ms)`,
          metrics: {
            response_time_ms: duration,
            threshold_ms: this.config.performanceThreshold,
          },
        };
      }

      return {
        component: 'database',
        status: 'healthy',
        details: `Response time: ${duration}ms`,
        metrics: {
          response_time_ms: duration,
        },
      };
    } catch (error: any) {
      return {
        component: 'database',
        status: 'critical',
        details: `Health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check communication system health
   */
  private async checkCommunicationHealth(): Promise<HealthCheckResult> {
    try {
      // Check recent communication attempts
      const { data, error } = await this.db
        .from('agent_audit_log')
        .select('*')
        .in('action', ['send_salesmsg', 'send_telegram'])
        .gte('ts', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('ts', { ascending: false });

      if (error) {
        return {
          component: 'communications',
          status: 'critical',
          details: `Database error: ${error.message}`,
        };
      }

      const totalAttempts = data?.length || 0;
      const failedAttempts = data?.filter(d => !d.success).length || 0;
      const failureRate = totalAttempts > 0 ? (failedAttempts / totalAttempts) * 100 : 0;

      if (failureRate > 50) {
        return {
          component: 'communications',
          status: 'critical',
          details: `High failure rate: ${failureRate.toFixed(1)}% (${failedAttempts}/${totalAttempts})`,
          metrics: {
            total_attempts: totalAttempts,
            failed_attempts: failedAttempts,
            failure_rate_percent: failureRate,
          },
        };
      } else if (failureRate > 20) {
        return {
          component: 'communications',
          status: 'degraded',
          details: `Elevated failure rate: ${failureRate.toFixed(1)}% (${failedAttempts}/${totalAttempts})`,
          metrics: {
            total_attempts: totalAttempts,
            failed_attempts: failedAttempts,
            failure_rate_percent: failureRate,
          },
        };
      }

      return {
        component: 'communications',
        status: 'healthy',
        details: `${totalAttempts} attempts, ${failedAttempts} failures in last hour`,
        metrics: {
          total_attempts: totalAttempts,
          failed_attempts: failedAttempts,
          failure_rate_percent: failureRate,
        },
      };
    } catch (error: any) {
      return {
        component: 'communications',
        status: 'critical',
        details: `Health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Check agent controls status
   */
  private async checkAgentControls(): Promise<HealthCheckResult> {
    try {
      const { data, error } = await this.db
        .from('agent_controls')
        .select('*')
        .single();

      if (error) {
        return {
          component: 'agent_controls',
          status: 'critical',
          details: `Database error: ${error.message}`,
        };
      }

      const issues: string[] = [];

      if (data.kill_switch) {
        issues.push('Kill switch is ENABLED');
      }

      if (!data.comms_enabled) {
        issues.push('Communications are DISABLED');
      }

      if (issues.length > 0) {
        return {
          component: 'agent_controls',
          status: 'degraded',
          details: issues.join(', '),
          metrics: {
            kill_switch: data.kill_switch,
            comms_enabled: data.comms_enabled,
            write_enabled: data.write_enabled,
            destructive_enabled: data.destructive_enabled,
          },
        };
      }

      return {
        component: 'agent_controls',
        status: 'healthy',
        details: 'All controls operational',
        metrics: {
          kill_switch: data.kill_switch,
          comms_enabled: data.comms_enabled,
          write_enabled: data.write_enabled,
          destructive_enabled: data.destructive_enabled,
        },
      };
    } catch (error: any) {
      return {
        component: 'agent_controls',
        status: 'critical',
        details: `Health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Process health results and send alerts
   */
  private async processHealthResults(results: HealthCheckResult[]): Promise<void> {
    const criticalIssues = results.filter(r => r.status === 'critical');
    const degradedIssues = results.filter(r => r.status === 'degraded');

    // Send SEV1 for critical issues
    if (criticalIssues.length > 0) {
      await this.router.routeNotification({
        severity: 'SEV1',
        type: 'health_report',
        title: 'Critical Health Issues Detected',
        body: criticalIssues
          .map(issue => `• ${issue.component}: ${issue.details}`)
          .join('\n'),
        requiresApproval: false, // SEV1 auto-approved
        meta: {
          critical_count: criticalIssues.length,
          issues: criticalIssues,
        },
      });
    }

    // Send WARN for degraded issues
    if (degradedIssues.length > 0 && criticalIssues.length === 0) {
      await this.router.routeNotification({
        severity: 'WARN',
        type: 'health_report',
        title: 'System Health Degraded',
        body: degradedIssues
          .map(issue => `• ${issue.component}: ${issue.details}`)
          .join('\n'),
        requiresApproval: false, // health_report is allowlisted
        meta: {
          degraded_count: degradedIssues.length,
          issues: degradedIssues,
        },
      });
    }
  }

  /**
   * Check if it's time to send daily digest
   */
  private shouldSendDailyDigest(): boolean {
    const now = new Date();
    const [targetHour, targetMinute] = this.config.dailyDigestTime.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = targetHour * 60 + targetMinute;

    const timeSinceLastDigest = Date.now() - this.lastDigestTime;
    const oneHourInMs = 60 * 60 * 1000;

    // Send if:
    // 1. Current time matches target time (within 5 minutes)
    // 2. Haven't sent in the last hour (prevent duplicates)
    const isTimeToSend =
      Math.abs(currentMinutes - targetMinutes) <= 5 &&
      timeSinceLastDigest > oneHourInMs;

    return isTimeToSend;
  }

  /**
   * Send daily digest
   */
  private async sendDailyDigest(results: HealthCheckResult[]): Promise<void> {
    try {
      const healthyCount = results.filter(r => r.status === 'healthy').length;
      const degradedCount = results.filter(r => r.status === 'degraded').length;
      const criticalCount = results.filter(r => r.status === 'critical').length;

      const overallStatus =
        criticalCount > 0 ? '🔴 CRITICAL' :
        degradedCount > 0 ? '🟡 DEGRADED' :
        '🟢 HEALTHY';

      const body = `
*Daily Health Report*

*Overall Status:* ${overallStatus}

*Components:*
${results.map(r => {
  const icon = r.status === 'healthy' ? '✅' :
               r.status === 'degraded' ? '⚠️' :
               '❌';
  return `${icon} ${r.component}: ${r.details}`;
}).join('\n')}

*Summary:*
• Healthy: ${healthyCount}
• Degraded: ${degradedCount}
• Critical: ${criticalCount}
      `.trim();

      await this.router.routeNotification({
        severity: 'INFO',
        type: 'daily_digest',
        title: 'Daily Health Digest',
        body,
        requiresApproval: false, // daily_digest is allowlisted
        channelOverride: 'telegram', // Prefer Telegram for non-urgent
        meta: {
          healthy_count: healthyCount,
          degraded_count: degradedCount,
          critical_count: criticalCount,
          results,
        },
      });

      this.lastDigestTime = Date.now();
    } catch (error: any) {
      console.error('Error sending daily digest:', error);
    }
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(): NodeJS.Timer {
    const intervalMs = this.config.checkIntervalMinutes * 60 * 1000;

    console.log(`Starting health monitor (checking every ${this.config.checkIntervalMinutes} minutes)`);

    // Run immediately
    this.runHealthChecks().catch(error => {
      console.error('Error in initial health check:', error);
    });

    // Then run periodically
    return setInterval(() => {
      this.runHealthChecks().catch(error => {
        console.error('Error in periodic health check:', error);
      });
    }, intervalMs);
  }
}

/**
 * Create and start health monitor
 */
export function createHealthMonitor(
  dbClient: any,
  router: CommunicationRouter,
  config?: Partial<HealthMonitorConfig>
): HealthMonitor {
  return new HealthMonitor(dbClient, router, config);
}
