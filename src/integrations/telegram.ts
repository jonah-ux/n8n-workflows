/**
 * Telegram Integration
 *
 * Handles messaging via Telegram Bot API
 * Docs: https://core.telegram.org/bots/api
 */

import crypto from 'crypto';

export interface TelegramConfig {
  botToken: string;
  baseUrl?: string;
  timeout?: number;
  defaultChatId?: string;
}

export interface SendMessageOptions {
  chatId: string | number;
  text: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  meta?: Record<string, any>;
  idempotencyKey?: string;
}

export interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
  errorCode?: number;
}

export class TelegramClient {
  private config: Required<TelegramConfig>;

  constructor(config: TelegramConfig) {
    this.config = {
      botToken: config.botToken,
      baseUrl: config.baseUrl || 'https://api.telegram.org',
      timeout: config.timeout || 10000,
      defaultChatId: config.defaultChatId || '',
    };

    if (!this.config.botToken) {
      throw new Error('Telegram bot token is required');
    }
  }

  /**
   * Send text message
   */
  async sendMessage(options: SendMessageOptions): Promise<TelegramResponse> {
    const {
      chatId,
      text,
      parseMode,
      disableWebPagePreview,
      disableNotification,
      idempotencyKey,
    } = options;

    // Use default chat ID if not specified
    const targetChatId = chatId || this.config.defaultChatId;

    if (!targetChatId) {
      return {
        success: false,
        error: 'Chat ID is required',
      };
    }

    const payload: Record<string, any> = {
      chat_id: targetChatId,
      text: text.substring(0, 4096), // Telegram max message length
    };

    if (parseMode) {
      payload.parse_mode = parseMode;
    }

    if (disableWebPagePreview !== undefined) {
      payload.disable_web_page_preview = disableWebPagePreview;
    }

    if (disableNotification !== undefined) {
      payload.disable_notification = disableNotification;
    }

    try {
      const response = await this.makeRequest('sendMessage', payload, idempotencyKey);

      return {
        success: true,
        messageId: response.result?.message_id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error sending message',
        errorCode: error.code,
      };
    }
  }

  /**
   * Get bot information (useful for testing)
   */
  async getMe(): Promise<any> {
    try {
      const response = await this.makeRequest('getMe', {});
      return response.result;
    } catch (error: any) {
      throw new Error(`Failed to get bot info: ${error.message}`);
    }
  }

  /**
   * Get updates (useful for finding your chat ID)
   */
  async getUpdates(offset?: number): Promise<any[]> {
    try {
      const payload: Record<string, any> = {};
      if (offset !== undefined) {
        payload.offset = offset;
      }

      const response = await this.makeRequest('getUpdates', payload);
      return response.result || [];
    } catch (error: any) {
      throw new Error(`Failed to get updates: ${error.message}`);
    }
  }

  /**
   * Make HTTP request to Telegram Bot API
   */
  private async makeRequest(
    method: string,
    data: any,
    idempotencyKey?: string
  ): Promise<any> {
    const url = `${this.config.baseUrl}/bot${this.config.botToken}/${method}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Note: Telegram doesn't officially support idempotency keys,
    // but we track them client-side to prevent duplicate sends
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!responseData.ok) {
        const error: any = new Error(
          responseData.description || 'Telegram API error'
        );
        error.code = responseData.error_code;
        throw error;
      }

      return responseData;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Telegram API timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Format text with Markdown
   */
  static formatMarkdown(text: string, options?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
  }): string {
    if (!options) return text;

    let formatted = text;

    if (options.bold) {
      formatted = `*${formatted}*`;
    }

    if (options.italic) {
      formatted = `_${formatted}_`;
    }

    if (options.code) {
      formatted = `\`${formatted}\``;
    }

    return formatted;
  }

  /**
   * Generate idempotency key
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
 * Create Telegram client from environment variables
 */
export function createTelegramClient(): TelegramClient {
  return new TelegramClient({
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    defaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID,
  });
}

/**
 * Retry logic with exponential backoff
 */
export async function sendMessageWithRetry(
  client: TelegramClient,
  options: SendMessageOptions,
  maxAttempts: number = 5
): Promise<TelegramResponse> {
  let lastError: string = '';
  let lastErrorCode: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await client.sendMessage(options);

      if (result.success) {
        return result;
      }

      lastError = result.error || 'Unknown error';
      lastErrorCode = result.errorCode;

      // Don't retry on specific errors
      const nonRetryableErrors = [
        'Chat not found',
        'Bot was blocked',
        'User is deactivated',
        'Chat ID is required',
      ];

      if (nonRetryableErrors.some(err => lastError.includes(err))) {
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
    errorCode: lastErrorCode,
  };
}

/**
 * Helper to find your chat ID
 *
 * Usage:
 * 1. Send a message to your bot (e.g., /start)
 * 2. Run this function
 * 3. It will return your chat ID
 */
export async function findMyChatId(client: TelegramClient): Promise<number | null> {
  try {
    const updates = await client.getUpdates();

    if (updates.length === 0) {
      console.log('No messages found. Send a message to your bot first.');
      return null;
    }

    const latestMessage = updates[updates.length - 1];
    const chatId = latestMessage.message?.chat?.id;

    if (chatId) {
      console.log(`Your chat ID is: ${chatId}`);
      return chatId;
    }

    return null;
  } catch (error: any) {
    console.error('Error finding chat ID:', error.message);
    return null;
  }
}
