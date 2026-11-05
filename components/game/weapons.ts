export type WeaponId = 'm4a1' | 'mp40' | 'm1887' | 'deagle' | 'woodpecker'

export interface Weapon {
  id: WeaponId
  name: string
  category: string
  damage: number
  headMultiplier: number
  pellets: number
  fireInterval: number
  magSize: number
  reloadTime: number
  hipSpread: number
  adsSpread: number
  range: number
  falloffStart: number
  recoil: number
  adsFov: number
  automatic: boolean
  color: string
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  m4a1: {
    id: 'm4a1',
    name: 'M4A1',
    category: 'Assault Rifle',
    damage: 32,
    headMultiplier: 1.9,
    pellets: 1,
    fireInterval: 0.11,
    magSize: 30,
    reloadTime: 2.1,
    hipSpread: 0.022,
    adsSpread: 0.006,
    range: 120,
    falloffStart: 35,
    recoil: 0.011,
    adsFov: 48,
    automatic: true,
    color: '#2b2f33',
  },
  mp40: {
    id: 'mp40',
    name: 'MP40',
    category: 'SMG',
    damage: 22,
    headMultiplier: 1.6,
    pellets: 1,
    fireInterval: 0.07,
    magSize: 32,
    reloadTime: 1.8,
    hipSpread: 0.032,
    adsSpread: 0.014,
    range: 60,
    falloffStart: 15,
    recoil: 0.008,
    adsFov: 56,
    automatic: true,
    color: '#3a3a36',
  },
  m1887: {
    id: 'm1887',
    name: 'M1887',
    category: 'Shotgun',
    damage: 19,
    headMultiplier: 1.4,
    pellets: 9,
    fireInterval: 0.85,
    magSize: 2,
    reloadTime: 2.4,
    hipSpread: 0.075,
    adsSpread: 0.06,
    range: 26,
    falloffStart: 7,
    recoil: 0.05,
    adsFov: 60,
    automatic: false,
    color: '#4a3424',
  },
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle',
    category: 'Pistol',
    damage: 64,
    headMultiplier: 1.8,
    pellets: 1,
    fireInterval: 0.42,
    magSize: 7,
    reloadTime: 1.6,
    hipSpread: 0.018,
    adsSpread: 0.004,
    range: 80,
    falloffStart: 25,
    recoil: 0.045,
    adsFov: 52,
    automatic: false,
    color: '#8a8d91',
  },
  woodpecker: {
    id: 'woodpecker',
    name: 'Woodpecker',
    category: 'Marksman Rifle',
    damage: 82,
    headMultiplier: 2.0,
    pellets: 1,
    fireInterval: 0.6,
    magSize: 12,
    reloadTime: 2.3,
    hipSpread: 0.03,
    adsSpread: 0.0015,
    range: 160,
    falloffStart: 80,
    recoil: 0.035,
    adsFov: 28,
    automatic: false,
    color: '#5a4630',
  },
}

export const WEAPON_POOL: WeaponId[] = ['m4a1', 'mp40', 'm1887', 'deagle', 'woodpecker']

export function damageAtDistance(w: Weapon, distance: number, headshot: boolean) {
  const t = Math.min(1, Math.max(0, (distance - w.falloffStart) / Math.max(1, w.range - w.falloffStart)))
  const falloff = 1 - t * 0.55
  return w.damage * falloff * (headshot ? w.headMultiplier : 1)
}
