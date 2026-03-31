/**
 * Telegram Webhook Handler
 * Handles bot commands and callback queries from Telegram
 */

import { NotificationService } from '../services/notifications.js';

export class TelegramWebhookHandler {
  constructor(env) {
    this.env = env;
    this.notificationService = new NotificationService(env);
  }

  /**
   * Handle incoming Telegram webhook request
   */
  async handleWebhook(request) {
    try {
      const update = await request.json();

      // Handle callback queries (inline button clicks)
      if (update.callback_query) {
        return await this.handleCallbackQuery(update.callback_query);
      }

      // Handle messages (commands)
      if (update.message) {
        return await this.handleMessage(update.message);
      }

      // Ignore other update types
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[TelegramWebhook] Error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handle Telegram message (commands)
   */
  async handleMessage(message) {
    const text = message.text || '';
    const chatId = message.chat?.id;

    // Only process commands from authorized chat
    if (String(chatId) !== String(this.env.TELEGRAM_CHAT_ID)) {
      console.log(`[TelegramWebhook] Unauthorized chat: ${chatId}`);
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse command
    const match = text.match(/^\/(\w+)(?:\s+(.+))?$/);
    if (!match) {
      // Not a command, ignore
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [, command, argsStr] = match;
    const args = argsStr ? argsStr.trim().split(/\s+/) : [];

    // Execute command
    await this.notificationService.handleTelegramCommand(command, args, message);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle Telegram callback query (inline button clicks)
   */
  async handleCallbackQuery(callbackQuery) {
    const result = await this.notificationService.handleTelegramCallback(callbackQuery);

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Set up Telegram webhook
   */
  async setWebhook(webhookUrl) {
    const token = this.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const endpoint = `https://api.telegram.org/bot${token}/setWebhook`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to set webhook: ${error}`);
    }

    return await response.json();
  }

  /**
   * Delete Telegram webhook
   */
  async deleteWebhook() {
    const token = this.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const endpoint = `https://api.telegram.org/bot${token}/deleteWebhook`;

    const response = await fetch(endpoint, {
      method: 'POST',
    });

    return await response.json();
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo() {
    const token = this.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const endpoint = `https://api.telegram.org/bot${token}/getWebhookInfo`;

    const response = await fetch(endpoint);
    return await response.json();
  }
}

export default TelegramWebhookHandler;
