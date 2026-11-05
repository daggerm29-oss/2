'use client'

import { useGame, MAX_HP, MAX_ROUNDS, ROUNDS_TO_WIN, type Side } from '../store'
import { WEAPONS } from '../weapons'
import { cn } from '@/lib/utils'

function HealthBar({ side, label }: { side: Side; label: string }) {
  const hp = useGame((s) => s.hp[side])
  const pct = (hp / MAX_HP) * 100
  return (
    <div className={cn('flex w-28 flex-col gap-1 sm:w-44', side === 'bot' && 'items-end')}>
      <div className="flex w-full items-baseline justify-between font-display text-xs uppercase tracking-wider text-white/90">
        <span className={cn('truncate', side === 'bot' && 'order-2')}>{label}</span>
        <span className="tabular-nums">{Math.ceil(hp)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-black/50 ring-1 ring-white/15">
        <div
          className={cn(
            'h-full transition-[width] duration-150',
            side === 'player' ? 'bg-team' : 'ml-auto bg-enemy',
            pct < 30 && 'animate-pulse',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function WinPips({ side }: { side: Side }) {
  const wins = useGame((s) => s.wins[side])
  return (
    <div className="flex gap-1" aria-label={`${wins} rounds won`}>
      {Array.from({ length: ROUNDS_TO_WIN }, (_, i) => (
        <span
          key={i}
          className={cn(
            'size-2.5 rotate-45 border border-white/40',
            i < wins && (side === 'player' ? 'border-team bg-team' : 'border-enemy bg-enemy'),
          )}
        />
      ))}
    </div>
  )
}

function Scoreboard() {
  const round = useGame((s) => s.round)
  const time = useGame((s) => Math.ceil(s.roundTime))
  const playerName = useGame((s) => s.playerName)
  const mm = Math.floor(time / 60)
  const ss = String(time % 60).padStart(2, '0')
  return (
    <div className="absolute inset-x-0 top-0 flex items-start justify-center gap-3 p-3 sm:gap-6">
      <HealthBar side="player" label={playerName} />
      <div className="flex flex-col items-center gap-1 rounded-md bg-black/55 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <WinPips side="player" />
          <span className={cn('font-display text-xl tabular-nums leading-none text-white', time <= 10 && 'text-primary')}>
            {mm}:{ss}
          </span>
          <WinPips side="bot" />
        </div>
        <span className="font-display text-[10px] uppercase tracking-[0.2em] text-white/60">
          Round {Math.min(round, MAX_ROUNDS)} / {MAX_ROUNDS}
        </span>
      </div>
      <HealthBar side="bot" label="Lone Wolf Bot" />
    </div>
  )
}

function Crosshair() {
  const aiming = useGame((s) => s.aiming)
  const weaponId = useGame((s) => s.weaponId)
  const lastHitAt = useGame((s) => s.lastHitAt)
  const head = useGame((s) => s.lastHitHeadshot)
  const w = WEAPONS[weaponId]
  const gap = Math.round(4 + (aiming ? w.adsSpread : w.hipSpread) * 260)
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-0" aria-hidden>
      <span className="absolute -left-px -top-px size-0.5 rounded-full bg-white shadow-[0_0_2px_black]" />
      {[0, 90, 180, 270].map((r) => (
        <span
          key={r}
          className="absolute left-0 top-0 h-0.5 w-2.5 origin-left bg-white/90 shadow-[0_0_2px_black] transition-transform duration-100"
          style={{ transform: `rotate(${r}deg) translateX(${gap}px) translateY(-50%)` }}
        />
      ))}
      {lastHitAt > 0 && (
        <div key={lastHitAt} className="hitmarker absolute left-0 top-0">
          {[45, 135, 225, 315].map((r) => (
            <span
              key={r}
              className={cn('absolute left-0 top-0 h-0.5 w-2 origin-left', head ? 'bg-primary' : 'bg-white')}
              style={{ transform: `rotate(${r}deg) translateX(6px) translateY(-50%)` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WeaponPanel() {
  const weaponId = useGame((s) => s.weaponId)
  const ammo = useGame((s) => s.ammo)
  const reloading = useGame((s) => s.reloading)
  const w = WEAPONS[weaponId]
  return (
    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-3 rounded-md bg-black/50 px-4 py-2 ring-1 ring-white/10 backdrop-blur-sm max-sm:bottom-auto max-sm:top-20">
      <div className="flex flex-col">
        <span className="font-display text-[10px] uppercase tracking-[0.2em] text-white/55">{w.category}</span>
        <span className="font-display text-base uppercase leading-tight tracking-wide text-white">{w.name}</span>
      </div>
      <div className="flex items-baseline gap-1 font-display tabular-nums">
        {reloading ? (
          <span className="animate-pulse text-sm uppercase tracking-widest text-primary">Reloading</span>
        ) : (
          <>
            <span className={cn('text-2xl leading-none text-white', ammo === 0 && 'text-enemy')}>{ammo}</span>
            <span className="text-sm text-white/50">/ {w.magSize}</span>
          </>
        )}
      </div>
    </div>
  )
}

function DamageVignette() {
  const lastDamagedAt = useGame((s) => s.lastDamagedAt)
  const hp = useGame((s) => s.hp.player)
  return (
    <>
      {lastDamagedAt > 0 && <div key={lastDamagedAt} className="damage-flash pointer-events-none absolute inset-0" aria-hidden />}
      {hp > 0 && hp < 60 && (
        <div
          className="pointer-events-none absolute inset-0 animate-pulse"
          style={{ boxShadow: 'inset 0 0 120px 20px rgba(200,20,20,0.45)' }}
          aria-hidden
        />
      )}
    </>
  )
}

function CenterBanner() {
  const phase = useGame((s) => s.phase)
  const countdown = useGame((s) => Math.ceil(s.countdown))
  const round = useGame((s) => s.round)
  const weaponId = useGame((s) => s.weaponId)
  const winner = useGame((s) => s.lastRoundWinner)
  const wins = useGame((s) => s.wins)
  const last = useGame((s) => s.history[s.history.length - 1])

  if (phase === 'countdown') {
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25">
        <span className="font-display text-sm uppercase tracking-[0.35em] text-white/80">Round {round}</span>
        <span key={countdown} className="countdown font-display text-8xl leading-none text-white drop-shadow-lg">
          {countdown}
        </span>
        <span className="rounded-sm bg-primary px-3 py-1 font-display text-sm uppercase tracking-widest text-primary-foreground">
          Weapon: {WEAPONS[weaponId].name}
        </span>
      </div>
    )
  }
  if (phase === 'roundEnd') {
    const title = winner === 'draw' ? 'Draw' : winner === 'player' ? 'Round Won' : 'Round Lost'
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
        <span
          className={cn(
            'font-display text-6xl uppercase tracking-wide drop-shadow-lg sm:text-7xl',
            winner === 'player' ? 'text-primary' : winner === 'bot' ? 'text-enemy' : 'text-white',
          )}
        >
          {title}
        </span>
        <span className="font-display text-lg uppercase tracking-[0.25em] text-white/85">
          {wins.player} — {wins.bot}
        </span>
        {last?.reason === 'time' && (
          <span className="text-xs uppercase tracking-widest text-white/60">Time up · higher HP wins</span>
        )}
      </div>
    )
  }
  return null
}

function ClickToPlay() {
  const locked = useGame((s) => s.pointerLocked)
  const phase = useGame((s) => s.phase)
  if (locked || (phase !== 'playing' && phase !== 'countdown')) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
      <div className="rounded-md bg-black/70 px-4 py-2 text-center text-sm text-white ring-1 ring-white/15">
        <p className="font-display uppercase tracking-widest">Click to lock aim</p>
        <p className="text-xs text-white/60">WASD move · Mouse aim · LMB fire · RMB scope · Space jump · R reload · Shift sprint</p>
      </div>
    </div>
  )
}

export function Hud({ touch }: { touch: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <DamageVignette />
      <Scoreboard />
      <Crosshair />
      <WeaponPanel />
      <CenterBanner />
      {!touch && <ClickToPlay />}
    </div>
  )
}
