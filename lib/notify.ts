import 'server-only';

import { DISCORD_WEBHOOK_URL } from './env';

export async function notifyDiscord(content: string): Promise<void> {
  const webhookUrl = DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  const payload = typeof content === 'string' ? content.trim() : '';
  if (!payload) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: payload }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[notifyDiscord] failed to deliver webhook', error);
  }
}
