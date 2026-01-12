/**
 * Communication Router with Safety Gates
 *
 * Orchestrates all outbound communications with:
 * - Allowlist enforcement
 * - Rate limiting
 * - Quiet hours
 * - Approval gating
 * - Audit logging
 * - Kill switch
 */

import { createSalesmsgClient, sendSmsWithRetry, SalesmsgClient } from '../integrations/salesmsg';
import { createTelegramClient, sendMessageWithRetry, TelegramClient } from '../integrations/telegram';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Types
export type Severity = 'SEV1' | 'WARN' | 'INFO';
export type Channel = 'salesmsg' | 'telegram';

export interface NotificationRequest {
  severity: Severity;
  type: string;
  title?: string;
  body: string;
  requiresApproval?: boolean;
  approvalToken?: string;
  channelOverride?: Channel;
  recipient?: {
    phone?: string;
    telegramChatId?: string | number;
  };
  meta?: Record<string, any>;
}

export interface RoutingResult {
  success: boolean;
  channel?: Channel;
  messageId?: string | number;
  error?: string;
  blocked?: boolean;
  blockReason?: string;
  queued?: boolean;
  auditId?: string;
}

export interface AgentControls {
  kill_switch: boolean;
  comms_enabled: boolean;
  write_enabled: boolean;
  destructive_enabled: boolean;
}

export interface RateLimitBucket {
  channel: Channel;
  count: number;
  windowStart: number;
}

// Configuration interfaces
interface CommunicationConfig {
  allowed_channels: Channel[];
  primary_channel: Channel;
  fallback_channel: Channel;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  rate_limits: {
    salesmsg: { max_per_hour: number };
    telegram: { max_per_hour: number };
  };
  retry: {
    max_attempts: number;
    initial_delay_ms: number;
    backoff_multiplier: number;
  };
}

interface AllowlistsConfig {
  allowlisted_phone_numbers: string[];
  allowlisted_telegram_chat_ids: (string | number)[];
  allowlisted_message_types: string[];
  allowlisted_action_types: string[];
  allowed_severities: Severity[];
  emergency_contacts: {
    phone_numbers: string[];
    telegram_chat_ids: (string | number)[];
  };
}

export class CommunicationRouter {
  private salesmsgClient: SalesmsgClient;
  private telegramClient: TelegramClient;
  private config: CommunicationConfig;
  private allowlists: AllowlistsConfig;
  private rateLimitBuckets: Map<string, RateLimitBucket> = new Map();
  private db: any; // Supabase client

  constructor(dbClient: any) {
    this.db = dbClient;

    // Load configuration
    this.config = this.loadConfig();
    this.allowlists = this.loadAllowlists();

    // Initialize clients
    this.salesmsgClient = createSalesmsgClient();
    this.telegramClient = createTelegramClient();
  }

  /**
   * Main routing function
   */
  async routeNotification(request: NotificationRequest): Promise<RoutingResult> {
    const startTime = Date.now();

    try {
      // Step 1: Check kill switch
      const controls = await this.getAgentControls();
      if (controls.kill_switch) {
        const result = {
          success: false,
          blocked: true,
          blockReason: 'Kill switch is enabled',
        };
        await this.auditLog('send_blocked', request, result, false, 'Kill switch enabled');
        return result;
      }

      // Step 2: Check comms enabled
      if (!controls.comms_enabled) {
        const result = {
          success: false,
          blocked: true,
          blockReason: 'Communications are disabled',
        };
        await this.auditLog('send_blocked', request, result, false, 'Comms disabled');
        return result;
      }

      // Step 3: Validate severity
      if (!this.allowlists.allowed_severities.includes(request.severity)) {
        const result = {
          success: false,
          blocked: true,
          blockReason: `Severity ${request.severity} not allowed`,
        };
        await this.auditLog('send_blocked', request, result, false, 'Invalid severity');
        return result;
      }

      // Step 4: Check approval
      const approvalCheck = this.checkApproval(request);
      if (!approvalCheck.approved) {
        const result = {
          success: false,
          blocked: true,
          blockReason: approvalCheck.reason,
        };
        await this.auditLog('send_blocked', request, result, false, approvalCheck.reason);
        return result;
      }

      // Step 5: Determine channel and recipient
      const { channel, recipient } = this.selectChannelAndRecipient(request);

      // Step 6: Check allowlist
      const allowlistCheck = this.checkAllowlist(channel, recipient);
      if (!allowlistCheck.allowed) {
        const result = {
          success: false,
          blocked: true,
          blockReason: allowlistCheck.reason,
        };
        await this.auditLog('send_blocked', request, result, false, allowlistCheck.reason);
        return result;
      }

      // Step 7: Check rate limits
      const rateLimitCheck = this.checkRateLimit(channel, request.severity);
      if (!rateLimitCheck.allowed) {
        const result = {
          success: false,
          blocked: true,
          blockReason: rateLimitCheck.reason,
        };
        await this.auditLog('rate_limited', request, result, false, rateLimitCheck.reason);
        return result;
      }

      // Step 8: Check quiet hours
      const quietHoursCheck = this.checkQuietHours(request.severity);
      if (!quietHoursCheck.allowed) {
        // Queue for later instead of blocking
        const result = {
          success: true,
          queued: true,
          blockReason: 'Queued due to quiet hours',
        };
        await this.auditLog('queued', request, result, true, 'Quiet hours');
        // TODO: Implement queue mechanism
        return result;
      }

      // Step 9: Send message
      const sendResult = await this.sendMessage(channel, recipient, request);

      // Step 10: Update rate limit
      if (sendResult.success && request.severity !== 'SEV1') {
        this.updateRateLimit(channel);
      }

      // Step 11: Audit log
      await this.auditLog(
        `send_${channel}`,
        request,
        sendResult,
        sendResult.success,
        sendResult.error
      );

      return sendResult;
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message || 'Unknown error in router',
      };
      await this.auditLog('router_error', request, result, false, error.message);
      return result;
    }
  }

  /**
   * Check approval requirements
   */
  private checkApproval(request: NotificationRequest): {
    approved: boolean;
    reason?: string;
  } {
    // SEV1 always requires explicit approval unless in emergency contacts
    if (request.severity === 'SEV1') {
      if (request.requiresApproval === false || request.approvalToken) {
        return { approved: true };
      }
      return {
        approved: false,
        reason: 'SEV1 messages require explicit approval',
      };
    }

    // Check if message type is allowlisted
    if (this.allowlists.allowlisted_message_types.includes(request.type)) {
      return { approved: true };
    }

    // Check explicit approval flag
    if (request.requiresApproval === false || request.approvalToken) {
      return { approved: true };
    }

    return {
      approved: false,
      reason: `Message type "${request.type}" requires approval`,
    };
  }

  /**
   * Select channel and recipient
   */
  private selectChannelAndRecipient(request: NotificationRequest): {
    channel: Channel;
    recipient: string | number;
  } {
    // Use channel override if provided
    let channel = request.channelOverride || this.config.primary_channel;

    // Get recipient
    let recipient: string | number | undefined;

    if (channel === 'salesmsg') {
      recipient =
        request.recipient?.phone ||
        this.allowlists.allowlisted_phone_numbers[0];
    } else if (channel === 'telegram') {
      recipient =
        request.recipient?.telegramChatId ||
        this.allowlists.allowlisted_telegram_chat_ids[0];
    }

    // Fallback if recipient not available for selected channel
    if (!recipient) {
      channel = this.config.fallback_channel;

      if (channel === 'telegram') {
        recipient = this.allowlists.allowlisted_telegram_chat_ids[0];
      } else {
        recipient = this.allowlists.allowlisted_phone_numbers[0];
      }
    }

    if (!recipient) {
      throw new Error('No recipient available on any channel');
    }

    return { channel, recipient };
  }

  /**
   * Check if recipient is on allowlist
   */
  private checkAllowlist(
    channel: Channel,
    recipient: string | number
  ): { allowed: boolean; reason?: string } {
    if (channel === 'salesmsg') {
      const phone = recipient as string;
      if (!this.allowlists.allowlisted_phone_numbers.includes(phone)) {
        return {
          allowed: false,
          reason: `Phone number ${phone} not on allowlist`,
        };
      }
    } else if (channel === 'telegram') {
      const chatId = recipient;
      const allowedIds = this.allowlists.allowlisted_telegram_chat_ids.map(id =>
        typeof id === 'string' ? parseInt(id, 10) : id
      );

      const recipientId =
        typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;

      if (!allowedIds.includes(recipientId)) {
        return {
          allowed: false,
          reason: `Telegram chat ID ${chatId} not on allowlist`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(
    channel: Channel,
    severity: Severity
  ): { allowed: boolean; reason?: string } {
    // SEV1 bypasses rate limits
    if (severity === 'SEV1') {
      return { allowed: true };
    }

    const bucket = this.rateLimitBuckets.get(channel);
    const maxPerHour =
      channel === 'salesmsg'
        ? this.config.rate_limits.salesmsg.max_per_hour
        : this.config.rate_limits.telegram.max_per_hour;

    if (!bucket) {
      return { allowed: true };
    }

    // Check if we're still in the same hour window
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    if (now - bucket.windowStart > hourInMs) {
      // New window, reset
      this.rateLimitBuckets.delete(channel);
      return { allowed: true };
    }

    if (bucket.count >= maxPerHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded for ${channel} (${maxPerHour}/hour)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(channel: Channel): void {
    const bucket = this.rateLimitBuckets.get(channel);
    const now = Date.now();

    if (!bucket || now - bucket.windowStart > 60 * 60 * 1000) {
      // New window
      this.rateLimitBuckets.set(channel, {
        channel,
        count: 1,
        windowStart: now,
      });
    } else {
      // Increment existing
      bucket.count += 1;
    }
  }

  /**
   * Check quiet hours
   */
  private checkQuietHours(severity: Severity): { allowed: boolean; reason?: string } {
    if (!this.config.quiet_hours.enabled) {
      return { allowed: true };
    }

    // SEV1 bypasses quiet hours
    if (severity === 'SEV1') {
      return { allowed: true };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [startHour, startMinute] = this.config.quiet_hours.start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = this.config.quiet_hours.end
      .split(':')
      .map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    let inQuietHours: boolean;

    if (startTime < endTime) {
      // Normal case: quiet hours don't span midnight
      inQuietHours = currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight (e.g., 21:00 - 07:00)
      inQuietHours = currentTime >= startTime || currentTime < endTime;
    }

    if (inQuietHours) {
      return {
        allowed: false,
        reason: 'Within quiet hours (non-critical message)',
      };
    }

    return { allowed: true };
  }

  /**
   * Send message via selected channel
   */
  private async sendMessage(
    channel: Channel,
    recipient: string | number,
    request: NotificationRequest
  ): Promise<RoutingResult> {
    const idempotencyKey = this.generateIdempotencyKey(request);

    try {
      if (channel === 'salesmsg') {
        const result = await sendSmsWithRetry(
          this.salesmsgClient,
          {
            to: recipient as string,
            body: this.formatMessageBody(request),
            meta: request.meta,
            idempotencyKey,
          },
          this.config.retry.max_attempts
        );

        return {
          success: result.success,
          channel: 'salesmsg',
          messageId: result.messageId,
          error: result.error,
        };
      } else if (channel === 'telegram') {
        const result = await sendMessageWithRetry(
          this.telegramClient,
          {
            chatId: recipient,
            text: this.formatMessageBody(request),
            parseMode: 'Markdown',
            idempotencyKey,
          },
          this.config.retry.max_attempts
        );

        return {
          success: result.success,
          channel: 'telegram',
          messageId: result.messageId,
          error: result.error,
        };
      }

      throw new Error(`Unknown channel: ${channel}`);
    } catch (error: any) {
      // Try fallback channel
      if (channel !== this.config.fallback_channel) {
        return this.sendMessage(
          this.config.fallback_channel,
          recipient,
          request
        );
      }

      return {
        success: false,
        error: error.message || 'Unknown error sending message',
      };
    }
  }

  /**
   * Format message body
   */
  private formatMessageBody(request: NotificationRequest): string {
    const severityEmoji = {
      SEV1: '🚨',
      WARN: '⚠️',
      INFO: 'ℹ️',
    };

    const emoji = severityEmoji[request.severity] || '';
    const title = request.title ? `*${request.title}*\n\n` : '';

    return `${emoji} *${request.severity}*\n\n${title}${request.body}`;
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(request: NotificationRequest): string {
    const data = {
      severity: request.severity,
      type: request.type,
      body: request.body,
      timestamp: Date.now(),
    };

    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Get agent controls from database
   */
  private async getAgentControls(): Promise<AgentControls> {
    try {
      const { data, error } = await this.db
        .from('agent_controls')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching agent controls:', error);
        // Default to safe values
        return {
          kill_switch: true,
          comms_enabled: false,
          write_enabled: false,
          destructive_enabled: false,
        };
      }

      return data;
    } catch (error) {
      console.error('Error in getAgentControls:', error);
      // Default to safe values
      return {
        kill_switch: true,
        comms_enabled: false,
        write_enabled: false,
        destructive_enabled: false,
      };
    }
  }

  /**
   * Audit log to database
   */
  private async auditLog(
    action: string,
    payload: any,
    result: any,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      await this.db.from('agent_audit_log').insert({
        ts: new Date().toISOString(),
        action,
        payload: this.sanitizePayload(payload),
        result: this.sanitizePayload(result),
        success,
        error: error || null,
      });
    } catch (err) {
      console.error('Error writing audit log:', err);
      // Don't throw - logging failure shouldn't break the operation
    }
  }

  /**
   * Sanitize payload before logging (remove sensitive data)
   */
  private sanitizePayload(payload: any): any {
    const sanitized = JSON.parse(JSON.stringify(payload));

    // Remove sensitive fields
    const sensitiveFields = ['approvalToken', 'apiKey', 'token', 'password'];

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Load configuration from YAML
   */
  private loadConfig(): CommunicationConfig {
    const configPath = path.join(process.cwd(), 'config', 'communication.yaml');

    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      return yaml.load(fileContents) as CommunicationConfig;
    } catch (error) {
      console.error('Error loading communication config:', error);
      throw new Error('Failed to load communication.yaml');
    }
  }

  /**
   * Load allowlists from YAML
   */
  private loadAllowlists(): AllowlistsConfig {
    const allowlistsPath = path.join(process.cwd(), 'config', 'allowlists.yaml');

    try {
      const fileContents = fs.readFileSync(allowlistsPath, 'utf8');
      return yaml.load(fileContents) as AllowlistsConfig;
    } catch (error) {
      console.error('Error loading allowlists config:', error);
      throw new Error('Failed to load allowlists.yaml');
    }
  }
}

/**
 * Pure utility functions for testing
 */

export function isInQuietHours(
  currentTime: Date,
  quietStart: string,
  quietEnd: string
): boolean {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  const [startHour, startMinute] = quietStart.split(':').map(Number);
  const [endHour, endMinute] = quietEnd.split(':').map(Number);

  const current = currentHour * 60 + currentMinute;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (start < end) {
    return current >= start && current < end;
  } else {
    return current >= start || current < end;
  }
}

export function isRateLimitExceeded(
  currentCount: number,
  maxPerHour: number
): boolean {
  return currentCount >= maxPerHour;
}

export function isPhoneNumberOnAllowlist(
  phoneNumber: string,
  allowlist: string[]
): boolean {
  return allowlist.includes(phoneNumber);
}
