/**
 * Safety & Control Plane
 *
 * Implements kill switch, permission checks, and forbidden action enforcement
 */

import { Database } from './database';
import { auditLog } from './audit';

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Check if kill switch is active
 */
export async function checkKillSwitch(db: Database): Promise<boolean> {
  try {
    const controls = await db.getAgentControls();
    return controls.kill_switch;
  } catch (error: any) {
    console.error('Failed to check kill switch:', error);
    // Fail-safe: If we can't check, assume kill switch is active
    return true;
  }
}

/**
 * Check if jobs are enabled
 */
export async function checkJobsEnabled(db: Database): Promise<boolean> {
  try {
    const controls = await db.getAgentControls();
    return controls.jobs_enabled && !controls.kill_switch;
  } catch (error: any) {
    console.error('Failed to check jobs enabled:', error);
    return false;
  }
}

/**
 * Check if communication is enabled
 */
export async function checkCommsEnabled(db: Database): Promise<boolean> {
  try {
    const controls = await db.getAgentControls();
    return controls.comms_enabled && !controls.kill_switch;
  } catch (error: any) {
    console.error('Failed to check comms enabled:', error);
    return false;
  }
}

/**
 * Check if external communication is enabled
 */
export async function checkExternalCommsEnabled(db: Database): Promise<boolean> {
  try {
    const controls = await db.getAgentControls();
    return controls.external_comms_enabled && controls.comms_enabled && !controls.kill_switch;
  } catch (error: any) {
    console.error('Failed to check external comms enabled:', error);
    return false;
  }
}

/**
 * Check if write operations are enabled
 */
export async function checkWriteEnabled(db: Database): Promise<boolean> {
  try {
    const controls = await db.getAgentControls();
    return controls.write_enabled && !controls.kill_switch;
  } catch (error: any) {
    console.error('Failed to check write enabled:', error);
    return false;
  }
}

/**
 * Check if action is forbidden
 */
export function isForbiddenAction(action: string): boolean {
  const FORBIDDEN_ACTIONS = [
    // External communications (unless explicitly enabled)
    'send_to_customer',
    'send_to_prospect',
    'send_to_partner',
    'post_social_media',

    // Data deletion
    'delete_data',
    'truncate_table',
    'drop_table',
    'delete_notion_page',

    // Direct modifications
    'modify_workflow',
    'change_config',
    'update_notion',
    'update_hubspot',
    'change_credentials',
    'deploy_code',
    'restart_service',

    // Financial actions
    'process_payment',
    'issue_refund',
    'modify_pricing',
    'create_invoice',

    // Credential management
    'rotate_api_key',
    'change_password',
    'generate_api_key',

    // Access control
    'grant_access',
    'modify_permissions',
    'bypass_auth',
    'escalate_privileges',

    // Kill switch bypass
    'disable_kill_switch',
    'bypass_kill_switch',

    // Compliance violations
    'send_spam',
    'share_pii',
    'bypass_privacy_controls',
  ];

  return FORBIDDEN_ACTIONS.includes(action);
}

/**
 * Check if currently in quiet hours
 */
export function isQuietHours(timezone: string = 'America/Chicago'): boolean {
  const now = new Date().toLocaleString('en-US', { timeZone: timezone });
  const hour = new Date(now).getHours();

  // Quiet hours: 21:00 (9 PM) to 6:00 (6 AM)
  return hour >= 21 || hour < 6;
}

/**
 * Check if severity bypasses quiet hours
 */
export function bypassesQuietHours(severity: string): boolean {
  return ['SEV0', 'SEV1'].includes(severity);
}

/**
 * Universal pre-action safety check
 */
export async function beforeAction(
  db: Database,
  action: string,
  actionType: 'read' | 'write' | 'propose' | 'alert' | 'api_call' | 'system',
  options?: {
    requiresExternalComms?: boolean;
    requiresWrite?: boolean;
    severity?: string;
  }
): Promise<SafetyCheckResult> {
  // 1. Check if action is explicitly forbidden
  if (isForbiddenAction(action)) {
    await auditLog(db, {
      action,
      action_type: actionType,
      success: false,
      error: 'Forbidden action',
    });

    return {
      allowed: false,
      reason: 'This action is explicitly forbidden',
      severity: 'error',
    };
  }

  // 2. Check kill switch
  if (await checkKillSwitch(db)) {
    await auditLog(db, {
      action,
      action_type: actionType,
      success: false,
      error: 'Kill switch is active',
    });

    return {
      allowed: false,
      reason: 'Kill switch is active - all actions blocked',
      severity: 'error',
    };
  }

  // 3. Check if external comms required
  if (options?.requiresExternalComms) {
    if (!(await checkExternalCommsEnabled(db))) {
      await auditLog(db, {
        action,
        action_type: actionType,
        success: false,
        error: 'External communications not enabled',
      });

      return {
        allowed: false,
        reason: 'External communications are disabled (external_comms_enabled=false)',
        severity: 'error',
      };
    }
  }

  // 4. Check if write operations required
  if (options?.requiresWrite) {
    if (!(await checkWriteEnabled(db))) {
      await auditLog(db, {
        action,
        action_type: actionType,
        success: false,
        error: 'Write operations not enabled',
      });

      return {
        allowed: false,
        reason: 'Write operations are disabled (write_enabled=false)',
        severity: 'error',
      };
    }
  }

  // 5. Check quiet hours (for non-critical alerts)
  if (actionType === 'alert' && !bypassesQuietHours(options?.severity || '')) {
    if (isQuietHours()) {
      return {
        allowed: false,
        reason: 'Currently in quiet hours (21:00-06:00 Central)',
        severity: 'info',
      };
    }
  }

  // All checks passed
  return { allowed: true };
}

/**
 * Universal post-action audit
 */
export async function afterAction(
  db: Database,
  action: string,
  actionType: 'read' | 'write' | 'propose' | 'alert' | 'api_call' | 'system',
  result: {
    success: boolean;
    error?: string;
    duration_ms?: number;
    input_data?: any;
    output_data?: any;
    cost_cents?: number;
  }
): Promise<void> {
  await auditLog(db, {
    action,
    action_type: actionType,
    ...result,
  });

  // If failed and critical, consider creating incident
  if (!result.success && actionType === 'system') {
    // TODO: Implement auto-incident creation for repeated system failures
  }
}

/**
 * Activate kill switch
 */
export async function activateKillSwitch(
  db: Database,
  reason: string,
  activatedBy: string = 'system'
): Promise<void> {
  await db.updateAgentControls({
    kill_switch: true,
    kill_switch_reason: reason,
    kill_switch_activated_at: new Date().toISOString(),
    kill_switch_activated_by: activatedBy,
  });

  await auditLog(db, {
    action: 'activate_kill_switch',
    action_type: 'system',
    success: true,
    input_data: { reason, activated_by: activatedBy },
  });

  console.error('⚠️  KILL SWITCH ACTIVATED:', reason);
}

/**
 * Deactivate kill switch
 */
export async function deactivateKillSwitch(
  db: Database,
  deactivatedBy: string = 'manual'
): Promise<void> {
  await db.updateAgentControls({
    kill_switch: false,
    kill_switch_reason: null,
    kill_switch_activated_at: null,
    kill_switch_activated_by: null,
  });

  await auditLog(db, {
    action: 'deactivate_kill_switch',
    action_type: 'system',
    success: true,
    input_data: { deactivated_by: deactivatedBy },
  });

  console.log('✅ Kill switch deactivated');
}
