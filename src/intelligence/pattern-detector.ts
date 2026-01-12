/**
 * Pattern Detector
 *
 * Detect patterns in system behavior that warrant proposals
 */

import { Database } from '../lib/database';
import { getRecentFailuresByAction } from '../lib/audit';

export interface Pattern {
  type: 'repeated_failures' | 'missing_sop' | 'config_drift' | 'cost_anomaly' | 'performance_issue';
  title: string;
  description: string;
  confidence: number;
  evidence: any;
  affectedSystems: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class PatternDetector {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Detect all patterns
   */
  async detectPatterns(options?: {
    lookbackHours?: number;
    minConfidence?: number;
  }): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Run all detectors in parallel
    const [
      repeatedFailures,
      missingSOPs,
      configDrift,
      costAnomalies,
      performanceIssues,
    ] = await Promise.all([
      this.detectRepeatedFailures(options?.lookbackHours),
      this.detectMissingSOPs(),
      this.detectConfigDrift(),
      this.detectCostAnomalies(options?.lookbackHours),
      this.detectPerformanceIssues(),
    ]);

    patterns.push(
      ...repeatedFailures,
      ...missingSOPs,
      ...configDrift,
      ...costAnomalies,
      ...performanceIssues
    );

    // Filter by minimum confidence
    const minConfidence = options?.minConfidence || 0.6;
    return patterns.filter((p) => p.confidence >= minConfidence);
  }

  /**
   * Detect repeated failures
   */
  async detectRepeatedFailures(lookbackHours: number = 24): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      const windowMinutes = lookbackHours * 60;
      const failuresByAction = await getRecentFailuresByAction(this.db, windowMinutes);

      for (const [action, count] of Object.entries(failuresByAction)) {
        if (count >= 3) {
          patterns.push({
            type: 'repeated_failures',
            title: `Repeated Failures: ${action}`,
            description: `Action "${action}" has failed ${count} times in the last ${lookbackHours} hours`,
            confidence: Math.min(0.9, 0.6 + (count / 10)),
            evidence: {
              action,
              failure_count: count,
              window_hours: lookbackHours,
            },
            affectedSystems: [action.split('.')[0] || 'unknown'],
            priority: count >= 10 ? 'critical' : count >= 5 ? 'high' : 'medium',
          });
        }
      }
    } catch (error: any) {
      console.error('Error detecting repeated failures:', error);
    }

    return patterns;
  }

  /**
   * Detect missing SOPs
   */
  async detectMissingSOPs(): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // TODO: Implement SOP gap detection
    // Compare n8n workflows with Notion SOPs
    // For now, return empty array - to be implemented

    return patterns;
  }

  /**
   * Detect config drift
   */
  async detectConfigDrift(): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // TODO: Implement config drift detection
    // Compare n8n configs with Notion canonical configs
    // For now, return empty array - to be implemented

    return patterns;
  }

  /**
   * Detect cost anomalies
   */
  async detectCostAnomalies(lookbackHours: number = 24): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      // Query API call volume in current window vs. baseline
      const now = new Date();
      const currentWindowStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
      const baselineWindowStart = new Date(currentWindowStart.getTime() - lookbackHours * 60 * 60 * 1000);

      // TODO: Implement cost anomaly detection
      // Compare current API call volume with baseline
      // For now, return empty array - to be implemented
    } catch (error: any) {
      console.error('Error detecting cost anomalies:', error);
    }

    return patterns;
  }

  /**
   * Detect performance issues
   */
  async detectPerformanceIssues(): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      // TODO: Implement performance issue detection
      // Analyze query response times, job durations
      // For now, return empty array - to be implemented
    } catch (error: any) {
      console.error('Error detecting performance issues:', error);
    }

    return patterns;
  }
}

/**
 * Create pattern detector
 */
export function createPatternDetector(db: Database): PatternDetector {
  return new PatternDetector(db);
}
