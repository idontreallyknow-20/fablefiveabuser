// Discord webhook posts, straight from the client — Discord allows
// cross-origin webhook execution, so no proxy is needed.

const WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

export function isDiscordWebhook(url: string): boolean {
  return WEBHOOK_RE.test(url.trim());
}

export async function postDiscord(webhook: string, content: string): Promise<boolean> {
  if (!isDiscordWebhook(webhook)) return false;
  try {
    const res = await fetch(webhook.trim(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900), username: "Orbit" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
