import { appUrlFrom, tg } from '@/lib/telegram-bot'

interface Chat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
}
interface Update {
  message?: { message_id: number; text?: string; chat: Chat; from?: { first_name?: string } }
  callback_query?: { id: string; game_short_name?: string; message?: { chat: Chat; message_id: number } }
}

const LAUNCH_COMMANDS = new Set(['/start', '/play', '/lonewolf'])

const INTRO =
  '🐺 *LONE WOLF 1v1*\nOne map. One weapon per round. 5 rounds — first to 3 wins.\nTap below to drop into the Dockyard.'

async function sendLaunch(chat: Chat, appUrl: string, replyTo: number) {
  const gameShortName = process.env.TELEGRAM_GAME_SHORT_NAME
  if (gameShortName) {
    await tg('sendGame', {
      chat_id: chat.id,
      game_short_name: gameShortName,
      reply_markup: { inline_keyboard: [[{ text: '🎮 Play Lone Wolf', callback_game: {} }]] },
    })
    return
  }

  if (chat.type === 'private') {
    await tg('sendMessage', {
      chat_id: chat.id,
      text: INTRO,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🎮 Play Lone Wolf', web_app: { url: appUrl } }]] },
    })
    return
  }

  // Groups cannot use web_app buttons; a Direct Link Mini App opens the game inside Telegram instead.
  const bot = process.env.TELEGRAM_BOT_USERNAME
  const app = process.env.TELEGRAM_MINIAPP_SHORT_NAME
  const startParam = `g${Math.abs(chat.id)}_${replyTo}`
  const url = bot && app ? `https://t.me/${bot}/${app}?startapp=${startParam}` : appUrl
  await tg('sendMessage', {
    chat_id: chat.id,
    text: INTRO,
    parse_mode: 'Markdown',
    reply_parameters: { message_id: replyTo, allow_sending_without_reply: true },
    reply_markup: { inline_keyboard: [[{ text: '🎮 Play Lone Wolf', url }]] },
  })
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('unauthorized', { status: 401 })
  }

  let update: Update
  try {
    update = (await req.json()) as Update
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const appUrl = appUrlFrom(req)

  try {
    const msg = update.message
    if (msg?.text) {
      const command = msg.text.trim().split(/\s+/)[0].split('@')[0].toLowerCase()
      if (LAUNCH_COMMANDS.has(command)) await sendLaunch(msg.chat, appUrl, msg.message_id)
    }

    const cb = update.callback_query
    if (cb?.game_short_name) {
      const chatId = cb.message?.chat.id
      const url = chatId ? `${appUrl}/?chat=${encodeURIComponent(String(chatId))}` : appUrl
      await tg('answerCallbackQuery', { callback_query_id: cb.id, url })
    }
  } catch (err) {
    console.error('[telegram] webhook error', err)
  }

  // Always 200 so Telegram doesn't retry the same update forever.
  return Response.json({ ok: true })
}
