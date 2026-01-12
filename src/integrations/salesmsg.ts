/**
 * Salesmsg Integration
 *
 * Handles SMS and calling via Salesmsg API
 * Docs: https://documenter.getpostman.com/view/11950726/TzRYc4kP
 */

import crypto from 'crypto';

export interface SalesmsgConfig {
  apiKey: string;
  baseUrl: string;
  fromNumber: string;
  timeout?: number;
}

export interface SendSmsOptions {
  to: string;
  body: string;
  meta?: Record<string, any>;
  idempotencyKey?: string;
}

export interface PlaceCallOptions {
  to: string;
  script?: string;
  meta?: Record<string, any>;
  idempotencyKey?: string;
}

export interface SalesmsgResponse {
  success: boolean;
  messageId?: string;
  callId?: string;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

export class SalesmsgClient {
  private config: Required<SalesmsgConfig>;

  constructor(config: SalesmsgConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.salesmsg.com/v1',
      fromNumber: config.fromNumber,
      timeout: config.timeout || 30000,
    };

    if (!this.config.apiKey) {
      throw new Error('Salesmsg API key is required');
    }

    if (!this.config.fromNumber) {
      throw new Error('Salesmsg from number is required');
    }
  }

  /**
   * Send SMS message
   */
  async sendSms(options: SendSmsOptions): Promise<SalesmsgResponse> {
    const { to, body, meta, idempotencyKey } = options;

    // Validate phone number format (E.164)
    if (!this.isValidE164(to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${to}. Must be E.164 format (e.g., +13204064600)`,
      };
    }

    const payload = {
      number: this.config.fromNumber,
      to_number: to,
      message: body,
      ...(meta && { metadata: meta }),
    };

    try {
      const response = await this.makeRequest('POST', '/messages', payload, idempotencyKey);

      return {
        success: true,
        messageId: response.id || response.message_id,
        rateLimitRemaining: this.extractRateLimitInfo(response),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error sending SMS',
      };
    }
  }

  /**
   * Place phone call
   *
   * TODO: Verify Salesmsg calling API endpoint and payload format
   * The calling feature may not be available or may use different endpoints
   */
  async placeCall(options: PlaceCallOptions): Promise<SalesmsgResponse> {
    const { to, script, meta, idempotencyKey } = options;

    // TODO: Implement when Salesmsg calling API is confirmed
    // Placeholder implementation:
    throw new Error(
      'Calling not yet implemented for Salesmsg. ' +
      'TODO: Verify API endpoint and payload format for placing calls. ' +
      'If Salesmsg does not support calling, remove this method and use SMS only.'
    );

    /* Example implementation when API is confirmed:
    if (!this.isValidE164(to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${to}`,
      };
    }

    const payload = {
      from_number: this.config.fromNumber,
      to_number: to,
      script: script || 'This is an automated call from your AI agent.',
      ...(meta && { metadata: meta }),
    };

    try {
      const response = await this.makeRequest('POST', '/calls', payload, idempotencyKey);

      return {
        success: true,
        callId: response.id || response.call_id,
        rateLimitRemaining: this.extractRateLimitInfo(response),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error placing call',
      };
    }
    */
  }

  /**
   * Make HTTP request to Salesmsg API
   */
  private async makeRequest(
    method: string,
    path: string,
    data?: any,
    idempotencyKey?: string
  ): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    // Add idempotency key if provided (prevents duplicate sends)
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `Salesmsg API error (${response.status}): ${
            responseData.message || responseData.error || 'Unknown error'
          }`
        );
      }

      return responseData;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Salesmsg API timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Validate E.164 phone number format
   */
  private isValidE164(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    // Example: +13204064600
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Extract rate limit info from response headers/body
   */
  private extractRateLimitInfo(response: any): number | undefined {
    // TODO: Update based on actual Salesmsg response format
    return response.rate_limit_remaining || undefined;
  }

  /**
   * Generate idempotency key for request
   */
  static generateIdempotencyKey(data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data) + Date.now())
      .digest('hex');
    return hash.substring(0, 32);
  }
}

/**
 * Create Salesmsg client from environment variables
 */
export function createSalesmsgClient(): SalesmsgClient {
  return new SalesmsgClient({
    apiKey: process.env.SALESMSG_API_KEY || '',
    baseUrl: process.env.SALESMSG_BASE_URL || '',
    fromNumber: process.env.SALESMSG_FROM_NUMBER || '',
  });
}

/**
 * Retry logic with exponential backoff
 */
export async function sendSmsWithRetry(
  client: SalesmsgClient,
  options: SendSmsOptions,
  maxAttempts: number = 5
): Promise<SalesmsgResponse> {
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await client.sendSms(options);

      if (result.success) {
        return result;
      }

      lastError = result.error || 'Unknown error';

      // Don't retry on validation errors
      if (lastError.includes('Invalid phone number')) {
        return result;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      lastError = error.message || 'Unknown error';

      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return {
    success: false,
    error: `Failed after ${maxAttempts} attempts. Last error: ${lastError}`,
  };
}
