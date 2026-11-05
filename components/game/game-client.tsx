'use client'

import dynamic from 'next/dynamic'

const GameRoot = dynamic(() => import('./game-root'), {
  ssr: false,
  loading: () => (
    <main className="flex h-dvh w-full items-center justify-center bg-background">
      <span className="font-display text-4xl uppercase tracking-tight text-white">Lone Wolf</span>
    </main>
  ),
})

export function GameClient() {
  return <GameRoot />
}
