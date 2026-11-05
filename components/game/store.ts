import { create } from 'zustand'
import { WEAPON_POOL, WEAPONS, type WeaponId } from './weapons'

export type Phase = 'menu' | 'countdown' | 'playing' | 'roundEnd' | 'matchEnd'
export type Side = 'player' | 'bot'
export type Difficulty = 'easy' | 'normal' | 'hard'

export const MAX_HP = 200
export const ROUNDS_TO_WIN = 3
export const MAX_ROUNDS = 5
export const ROUND_TIME = 75
export const COUNTDOWN_TIME = 3
export const ROUND_END_TIME = 3.5

export interface RoundResult {
  round: number
  winner: Side | 'draw'
  reason: 'kill' | 'time'
  weapon: WeaponId
}

interface GameState {
  phase: Phase
  round: number
  wins: Record<Side, number>
  history: RoundResult[]
  weaponId: WeaponId
  hp: Record<Side, number>
  ammo: number
  reloading: boolean
  roundTime: number
  countdown: number
  phaseTimer: number
  roundKey: number
  lastRoundWinner: Side | 'draw' | null
  lastHitAt: number
  lastHitHeadshot: boolean
  lastDamagedAt: number
  aiming: boolean
  pointerLocked: boolean
  difficulty: Difficulty
  sensitivity: number
  playerName: string
  stats: { shots: number; hits: number; headshots: number; damage: number }

  setPlayerName: (n: string) => void
  setDifficulty: (d: Difficulty) => void
  setSensitivity: (s: number) => void
  setAiming: (a: boolean) => void
  setPointerLocked: (l: boolean) => void
  setAmmo: (a: number) => void
  setReloading: (r: boolean) => void
  startMatch: () => void
  backToMenu: () => void
  applyDamage: (target: Side, amount: number, headshot: boolean) => void
  registerShot: () => void
  tick: (dt: number) => void
}

function pickWeapon(prev?: WeaponId): WeaponId {
  const pool = WEAPON_POOL.filter((w) => w !== prev)
  return pool[Math.floor(Math.random() * pool.length)]
}

export const useGame = create<GameState>((set, get) => ({
  phase: 'menu',
  round: 1,
  wins: { player: 0, bot: 0 },
  history: [],
  weaponId: 'm4a1',
  hp: { player: MAX_HP, bot: MAX_HP },
  ammo: WEAPONS.m4a1.magSize,
  reloading: false,
  roundTime: ROUND_TIME,
  countdown: COUNTDOWN_TIME,
  phaseTimer: 0,
  roundKey: 0,
  lastRoundWinner: null,
  lastHitAt: 0,
  lastHitHeadshot: false,
  lastDamagedAt: 0,
  aiming: false,
  pointerLocked: false,
  difficulty: 'normal',
  sensitivity: 1,
  playerName: 'You',
  stats: { shots: 0, hits: 0, headshots: 0, damage: 0 },

  setPlayerName: (playerName) => set({ playerName }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setAiming: (aiming) => set({ aiming }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setAmmo: (ammo) => set({ ammo }),
  setReloading: (reloading) => set({ reloading }),

  startMatch: () => {
    const weaponId = pickWeapon()
    set((s) => ({
      phase: 'countdown',
      round: 1,
      wins: { player: 0, bot: 0 },
      history: [],
      weaponId,
      hp: { player: MAX_HP, bot: MAX_HP },
      ammo: WEAPONS[weaponId].magSize,
      reloading: false,
      roundTime: ROUND_TIME,
      countdown: COUNTDOWN_TIME,
      roundKey: s.roundKey + 1,
      lastRoundWinner: null,
      stats: { shots: 0, hits: 0, headshots: 0, damage: 0 },
    }))
  },

  backToMenu: () => set({ phase: 'menu', aiming: false }),

  registerShot: () => set((s) => ({ stats: { ...s.stats, shots: s.stats.shots + 1 } })),

  applyDamage: (target, amount, headshot) => {
    const s = get()
    if (s.phase !== 'playing' || s.hp[target] <= 0) return
    const next = Math.max(0, s.hp[target] - amount)
    const now = performance.now()
    const patch: Partial<GameState> = { hp: { ...s.hp, [target]: next } }
    if (target === 'bot') {
      patch.lastHitAt = now
      patch.lastHitHeadshot = headshot
      patch.stats = {
        shots: s.stats.shots,
        hits: s.stats.hits + 1,
        headshots: s.stats.headshots + (headshot ? 1 : 0),
        damage: s.stats.damage + Math.min(amount, s.hp[target]),
      }
    } else {
      patch.lastDamagedAt = now
    }
    set(patch)
    if (next <= 0) endRound(target === 'bot' ? 'player' : 'bot', 'kill')
  },

  tick: (dt) => {
    const s = get()
    if (s.phase === 'countdown') {
      const c = s.countdown - dt
      if (c <= 0) set({ phase: 'playing', countdown: 0 })
      else set({ countdown: c })
    } else if (s.phase === 'playing') {
      const t = s.roundTime - dt
      if (t <= 0) {
        set({ roundTime: 0 })
        const p = s.hp.player
        const b = s.hp.bot
        endRound(p === b ? 'draw' : p > b ? 'player' : 'bot', 'time')
      } else set({ roundTime: t })
    } else if (s.phase === 'roundEnd') {
      const t = s.phaseTimer - dt
      if (t > 0) {
        set({ phaseTimer: t })
        return
      }
      if (s.wins.player >= ROUNDS_TO_WIN || s.wins.bot >= ROUNDS_TO_WIN || s.round >= MAX_ROUNDS + 2) {
        set({ phase: 'matchEnd', aiming: false })
        return
      }
      const weaponId = pickWeapon(s.weaponId)
      set({
        phase: 'countdown',
        round: s.lastRoundWinner === 'draw' ? s.round : s.round + 1,
        weaponId,
        hp: { player: MAX_HP, bot: MAX_HP },
        ammo: WEAPONS[weaponId].magSize,
        reloading: false,
        roundTime: ROUND_TIME,
        countdown: COUNTDOWN_TIME,
        roundKey: s.roundKey + 1,
      })
    }
  },
}))

function endRound(winner: Side | 'draw', reason: 'kill' | 'time') {
  const s = useGame.getState()
  if (s.phase !== 'playing') return
  const wins = { ...s.wins }
  if (winner !== 'draw') wins[winner] += 1
  useGame.setState({
    phase: 'roundEnd',
    wins,
    lastRoundWinner: winner,
    phaseTimer: ROUND_END_TIME,
    aiming: false,
    history: [...s.history, { round: s.round, winner, reason, weapon: s.weaponId }],
  })
}
