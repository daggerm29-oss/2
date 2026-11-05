'use client'

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  version?: string
  platform?: string
  isVersionAtLeast?: (v: string) => boolean
  requestFullscreen?: () => void
  lockOrientation?: () => void
  disableVerticalSwipes?: () => void
  enableClosingConfirmation?: () => void
  disableClosingConfirmation?: () => void
  setHeaderColor?: (c: string) => void
  setBackgroundColor?: (c: string) => void
  initDataUnsafe?: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string }
    start_param?: string
    chat?: { id: number; title?: string }
  }
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  const tg = window.Telegram?.WebApp
  if (!tg || !tg.platform || tg.platform === 'unknown') return null
  return tg
}

function safe(fn: () => void) {
  try {
    fn()
  } catch {
    // Older Telegram clients throw for unsupported methods.
  }
}

export function initTelegram() {
  const tg = getTelegram()
  if (!tg) return null
  safe(() => tg.ready())
  safe(() => tg.expand())
  safe(() => tg.setHeaderColor?.('#0b0d10'))
  safe(() => tg.setBackgroundColor?.('#0b0d10'))
  if (tg.isVersionAtLeast?.('7.7')) safe(() => tg.disableVerticalSwipes?.())
  return tg
}

export function enterGameMode() {
  const tg = getTelegram()
  if (tg) {
    if (tg.isVersionAtLeast?.('8.0')) {
      safe(() => tg.requestFullscreen?.())
      safe(() => tg.lockOrientation?.())
    }
    if (tg.isVersionAtLeast?.('6.2')) safe(() => tg.enableClosingConfirmation?.())
  }
}

export function exitGameMode() {
  const tg = getTelegram()
  if (tg?.isVersionAtLeast?.('6.2')) safe(() => tg.disableClosingConfirmation?.())
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  const tg = getTelegram()
  if (tg?.isVersionAtLeast?.('6.1')) safe(() => tg.HapticFeedback?.impactOccurred(style))
}

export function hapticNotify(type: 'error' | 'success' | 'warning') {
  const tg = getTelegram()
  if (tg?.isVersionAtLeast?.('6.1')) safe(() => tg.HapticFeedback?.notificationOccurred(type))
}

export function getTelegramUserName() {
  const u = getTelegram()?.initDataUnsafe?.user
  if (!u) return null
  return u.first_name || u.username || null
}
