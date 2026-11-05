import { appUrlFrom, tg } from '@/lib/telegram-bot'

/**
 * One-time setup: open /api/telegram/setup?secret=<TELEGRAM_WEBHOOK_SECRET> on the deployed URL.
 * Registers the webhook and the bot command menu.
 */
export async function GET(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const provided = new URL(req.url).searchParams.get('secret')
  if (!secret || provided !== secret) return new Response('unauthorized', { status: 401 })

  const appUrl = appUrlFrom(req)
  try {
    await tg('setWebhook', {
      url: `${appUrl}/api/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    })
    const commands = [
      { command: 'start', description: 'Launch Lone Wolf 1v1' },
      { command: 'play', description: 'Start a Lone Wolf match' },
    ]
    await tg('setMyCommands', { commands })
    await tg('setMyCommands', { commands, scope: { type: 'all_group_chats' } })
    return Response.json({ ok: true, webhook: `${appUrl}/api/telegram/webhook` })
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
