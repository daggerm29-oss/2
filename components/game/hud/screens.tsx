'use client'

import { Button } from '@/components/ui/button'
import { useGame, MAX_ROUNDS, ROUNDS_TO_WIN, type Difficulty } from '../store'
import { WEAPONS, WEAPON_POOL } from '../weapons'
import { cn } from '@/lib/utils'

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

export function MainMenu({ onStart }: { onStart: () => void }) {
  const difficulty = useGame((s) => s.difficulty)
  const setDifficulty = useGame((s) => s.setDifficulty)
  const sensitivity = useGame((s) => s.sensitivity)
  const setSensitivity = useGame((s) => s.setSensitivity)
  const playerName = useGame((s) => s.playerName)

  return (
    <div className="absolute inset-0 z-30 touch-pan-y overflow-y-auto bg-gradient-to-r from-black/90 via-black/65 to-black/20">
      <div className="flex min-h-full max-w-xl flex-col justify-center gap-6 p-6 sm:p-10">
        <div className="flex flex-col gap-1">
          <span className="font-display text-xs uppercase tracking-[0.4em] text-primary">1v1 Arena · Dockyard</span>
          <h1 className="font-display text-6xl uppercase leading-none tracking-tight text-white text-balance sm:text-7xl">
            Lone Wolf
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/70 text-pretty">
            {`One map. One weapon per round. First to ${ROUNDS_TO_WIN} round wins across ${MAX_ROUNDS} rounds takes the match. Welcome, ${playerName}.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" aria-label="Weapon pool">
          {WEAPON_POOL.map((id) => (
            <span
              key={id}
              className="rounded-sm border border-white/15 bg-white/5 px-2 py-1 font-display text-[11px] uppercase tracking-wider text-white/75"
            >
              {WEAPONS[id].name}
            </span>
          ))}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-display text-xs uppercase tracking-[0.25em] text-white/60">Opponent</legend>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={difficulty === d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'flex-1 rounded-md border px-3 py-2 font-display text-sm uppercase tracking-widest transition-colors',
                  difficulty === d
                    ? 'border-primary bg-primary/20 text-white'
                    : 'border-white/15 bg-white/5 text-white/65 hover:bg-white/10',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="flex justify-between font-display text-xs uppercase tracking-[0.25em] text-white/60">
            <span>Sensitivity</span>
            <span className="tabular-nums text-white/80">{sensitivity.toFixed(1)}</span>
          </span>
          <input
            type="range"
            min={0.3}
            max={2.5}
            step={0.1}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="accent-primary"
          />
        </label>

        <Button size="lg" onClick={onStart} className="h-14 font-display text-xl uppercase tracking-[0.2em]">
          Start Match
        </Button>
        <p className="text-xs text-white/45">Best played in landscape. Real-time PvP with group members is coming next.</p>
      </div>
    </div>
  )
}

export function MatchEnd({ onRestart, onMenu }: { onRestart: () => void; onMenu: () => void }) {
  const wins = useGame((s) => s.wins)
  const history = useGame((s) => s.history)
  const stats = useGame((s) => s.stats)
  const won = wins.player > wins.bot
  const accuracy = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0

  return (
    <div className="absolute inset-0 z-30 flex touch-pan-y items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-white/10 bg-card/90 p-6 text-card-foreground">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-display text-xs uppercase tracking-[0.4em] text-white/55">Match over</span>
          <h2 className={cn('font-display text-5xl uppercase', won ? 'text-primary' : 'text-enemy')}>
            {won ? 'Victory' : 'Defeat'}
          </h2>
          <span className="font-display text-2xl tabular-nums text-white">
            {wins.player} — {wins.bot}
          </span>
        </div>
        <ol className="flex flex-col gap-1.5">
          {history.map((h, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2 text-sm">
              <span className="font-display uppercase tracking-wider text-white/70">R{h.round} · {WEAPONS[h.weapon].name}</span>
              <span
                className={cn(
                  'font-display uppercase tracking-wider',
                  h.winner === 'player' ? 'text-primary' : h.winner === 'bot' ? 'text-enemy' : 'text-white/60',
                )}
              >
                {h.winner === 'player' ? 'Won' : h.winner === 'bot' ? 'Lost' : 'Draw'}
                {h.reason === 'time' ? ' · time' : ''}
              </span>
            </li>
          ))}
        </ol>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Damage', stats.damage],
            ['Accuracy', `${accuracy}%`],
            ['Headshots', stats.headshots],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-md bg-white/5 p-2">
              <dt className="text-[10px] uppercase tracking-widest text-white/50">{k}</dt>
              <dd className="font-display text-xl tabular-nums text-white">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 font-display uppercase tracking-widest" onClick={onMenu}>
            Menu
          </Button>
          <Button className="flex-1 font-display uppercase tracking-widest" onClick={onRestart}>
            Rematch
          </Button>
        </div>
      </div>
    </div>
  )
}
