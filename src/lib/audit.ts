/**
 * Audit Logger
 *
 * Centralized audit logging for all agent actions
 */

import { Database } from './database';

export interface AuditEntry {
  action: string;
  action_type: 'read' | 'write' | 'propose' | 'alert' | 'api_call' | 'system';
  success: boolean;
  error?: string;
  duration_ms?: number;
  input_data?: any;
  output_data?: any;
  session_id?: string;
  cost_cents?: number;
  source?: string;
  target?: string;
}

/**
 * Log action to audit trail
 */
export async function auditLog(db: Database, entry: AuditEntry): Promise<void> {
  try {
    await db.insertAuditLog(entry);
  } catch (error: any) {
    // Audit logging should never block operations
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Log action with automatic timing
 */
export async function auditLogWithTiming<T>(
  db: Database,
  action: string,
  actionType: AuditEntry['action_type'],
  fn: () => Promise<T>,
  options?: {
    input_data?: any;
    session_id?: string;
    cost_cents?: number;
  }
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  let result: T;

  try {
    result = await fn();
    success = true;
    return result;
  } catch (e: any) {
    error = e.message;
    throw e;
  } finally {
    const duration_ms = Date.now() - startTime;

    await auditLog(db, {
      action,
      action_type: actionType,
      success,
      error,
      duration_ms,
      input_data: options?.input_data,
      output_data: success ? result : undefined,
      session_id: options?.session_id,
      cost_cents: options?.cost_cents,
    });
  }
}

/**
 * Query audit log for analysis
 */
export async function queryAuditLog(
  db: Database,
  filters: {
    action?: string;
    action_type?: string;
    success?: boolean;
    since?: Date;
    limit?: number;
  }
) {
  const client = db.getClient();
  let query = client.from('agent_audit_log').select('*');

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.action_type) {
    query = query.eq('action_type', filters.action_type);
  }

  if (filters.success !== undefined) {
    query = query.eq('success', filters.success);
  }

  if (filters.since) {
    query = query.gte('ts', filters.since.toISOString());
  }

  query = query.order('ts', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query audit log: ${error.message}`);
  }

  return data || [];
}

/**
 * Get failure count for an action in time window
 */
export async function getFailureCount(
  db: Database,
  action: string,
  windowMinutes: number = 30
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const failures = await queryAuditLog(db, {
    action,
    success: false,
    since,
  });

  return failures.length;
}

/**
 * Get recent failures grouped by action
 */
export async function getRecentFailuresByAction(
  db: Database,
  windowMinutes: number = 30
): Promise<Record<string, number>> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const failures = await queryAuditLog(db, {
    success: false,
    since,
  });

  const grouped: Record<string, number> = {};

  failures.forEach((failure) => {
    grouped[failure.action] = (grouped[failure.action] || 0) + 1;
  });

  return grouped;
}

/**
 * Get total cost in time window
 */
export async function getTotalCost(
  db: Database,
  windowHours: number = 24
): Promise<number> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const entries = await queryAuditLog(db, {
    since,
  });

  return entries.reduce((sum, entry) => sum + (entry.cost_cents || 0), 0);
}
