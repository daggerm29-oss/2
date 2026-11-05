'use client'

import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { GameScene } from './scene'
import { Hud } from './hud/hud'
import { TouchControls } from './hud/touch-controls'
import { MainMenu, MatchEnd } from './hud/screens'
import { useGame } from './store'
import { useDesktopInput } from './use-desktop-input'
import { input } from './runtime'
import { enterGameMode, exitGameMode, getTelegramUserName, hapticNotify, initTelegram } from '@/lib/telegram'

function LoadingOverlay() {
  const { progress, active } = useProgress()
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 12000)
    return () => clearTimeout(t)
  }, [])
  if (timedOut || (!active && progress >= 100)) return null
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background">
      <span className="font-display text-4xl uppercase tracking-tight text-white">Lone Wolf</span>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <span className="font-display text-xs uppercase tracking-[0.3em] text-white/50">Deploying to Dockyard</span>
    </div>
  )
}

export default function GameRoot() {
  const phase = useGame((s) => s.phase)
  const startMatch = useGame((s) => s.startMatch)
  const backToMenu = useGame((s) => s.backToMenu)
  const winsPlayer = useGame((s) => s.wins.player)
  const winsBot = useGame((s) => s.wins.bot)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [touch, setTouch] = useState(false)
  const inMatch = phase === 'countdown' || phase === 'playing' || phase === 'roundEnd'

  useEffect(() => {
    initTelegram()
    const name = getTelegramUserName()
    if (name) useGame.getState().setPlayerName(name)
    setTouch(
      window.matchMedia('(pointer: coarse)').matches ||
        (navigator.maxTouchPoints > 0 && !window.matchMedia('(hover: hover)').matches),
    )
  }, [])

  useEffect(() => {
    if (phase === 'matchEnd') {
      hapticNotify(winsPlayer > winsBot ? 'success' : 'error')
      exitGameMode()
      if (document.pointerLockElement) document.exitPointerLock()
    }
    if (phase !== 'playing') input.fire = false
  }, [phase, winsPlayer, winsBot])

  useDesktopInput(container)

  const start = () => {
    enterGameMode()
    startMatch()
    window.focus()
    if (!touch) container?.requestPointerLock?.()
  }

  return (
    <main ref={setContainer} className="relative h-dvh w-full overflow-hidden bg-background">
      <h1 className="sr-only">Lone Wolf 1v1</h1>
      <GameScene />
      {inMatch && <Hud touch={touch} />}
      {inMatch && touch && phase !== 'roundEnd' && <TouchControls />}
      {phase === 'menu' && <MainMenu onStart={start} />}
      {phase === 'matchEnd' && (
        <MatchEnd
          onRestart={start}
          onMenu={() => {
            backToMenu()
          }}
        />
      )}
      <LoadingOverlay />
    </main>
  )
}
