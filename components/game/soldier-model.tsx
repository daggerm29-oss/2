'use client'

import { forwardRef, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WeaponId } from './weapons'

export interface SoldierAnim {
  speed: number
  pitch: number
  dead: boolean
  grounded: boolean
  recoil: number
}

interface Palette {
  uniform: string
  vest: string
  accent: string
  skin: string
}

export const PALETTES: Record<'player' | 'bot', Palette> = {
  player: { uniform: '#3b4a3a', vest: '#26302a', accent: '#2a7de1', skin: '#c99a7a' },
  bot: { uniform: '#4a3b33', vest: '#2d2420', accent: '#e14a2a', skin: '#b98a6a' },
}

function useMats(p: Palette) {
  return useMemo(
    () => ({
      uniform: new THREE.MeshStandardMaterial({ color: p.uniform, roughness: 0.88 }),
      vest: new THREE.MeshStandardMaterial({ color: p.vest, roughness: 0.75 }),
      accent: new THREE.MeshStandardMaterial({ color: p.accent, roughness: 0.5, emissive: p.accent, emissiveIntensity: 0.25 }),
      skin: new THREE.MeshStandardMaterial({ color: p.skin, roughness: 0.65 }),
      boot: new THREE.MeshStandardMaterial({ color: '#1b1a18', roughness: 0.7 }),
      helmet: new THREE.MeshStandardMaterial({ color: p.vest, roughness: 0.55, metalness: 0.2 }),
      visor: new THREE.MeshStandardMaterial({ color: '#0b0d10', roughness: 0.15, metalness: 0.9 }),
      gunMetal: new THREE.MeshStandardMaterial({ color: '#1e2124', roughness: 0.35, metalness: 0.85 }),
      gunWood: new THREE.MeshStandardMaterial({ color: '#5b3a22', roughness: 0.6 }),
      gunSteel: new THREE.MeshStandardMaterial({ color: '#9ca1a6', roughness: 0.3, metalness: 0.95 }),
    }),
    [p],
  )
}

type Mats = ReturnType<typeof useMats>

function GunModel({ weapon, mats, muzzleRef }: { weapon: WeaponId; mats: Mats; muzzleRef: MutableRefObject<THREE.Object3D | null> }) {
  const setMuzzle = (z: number) => (
    <object3D
      position={[0, 0.02, z]}
      ref={(el) => {
        muzzleRef.current = el
      }}
    />
  )
  switch (weapon) {
    case 'deagle':
      return (
        <group>
          <mesh material={mats.gunSteel} position={[0, 0.03, 0.08]} castShadow>
            <boxGeometry args={[0.04, 0.05, 0.24]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, -0.04, 0.0]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.035, 0.12, 0.05]} />
          </mesh>
          {setMuzzle(0.21)}
        </group>
      )
    case 'm1887':
      return (
        <group>
          <mesh material={mats.gunWood} position={[0, -0.02, -0.2]} castShadow>
            <boxGeometry args={[0.05, 0.09, 0.32]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.0, 0.05]} castShadow>
            <boxGeometry args={[0.06, 0.08, 0.2]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.02, 0.38]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.52, 8]} />
          </mesh>
          <mesh material={mats.gunWood} position={[0, -0.02, 0.32]} castShadow>
            <boxGeometry args={[0.05, 0.05, 0.22]} />
          </mesh>
          {setMuzzle(0.65)}
        </group>
      )
    case 'woodpecker':
      return (
        <group>
          <mesh material={mats.gunWood} position={[0, -0.01, -0.12]} castShadow>
            <boxGeometry args={[0.05, 0.1, 0.4]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.01, 0.15]} castShadow>
            <boxGeometry args={[0.055, 0.08, 0.3]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.02, 0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.014, 0.016, 0.55, 8]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.09, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.26, 10]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, -0.08, 0.12]} castShadow>
            <boxGeometry args={[0.035, 0.1, 0.06]} />
          </mesh>
          {setMuzzle(0.83)}
        </group>
      )
    case 'mp40':
      return (
        <group>
          <mesh material={mats.gunMetal} position={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[0.05, 0.07, 0.36]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.01, 0.32]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.014, 0.014, 0.2, 8]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, -0.14, 0.1]} castShadow>
            <boxGeometry args={[0.03, 0.2, 0.04]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, -0.02, -0.2]} castShadow>
            <boxGeometry args={[0.02, 0.04, 0.2]} />
          </mesh>
          {setMuzzle(0.43)}
        </group>
      )
    default:
      return (
        <group>
          <mesh material={mats.gunMetal} position={[0, -0.01, -0.2]} castShadow>
            <boxGeometry args={[0.05, 0.1, 0.24]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.01, 0.08]} castShadow>
            <boxGeometry args={[0.055, 0.09, 0.34]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.0, 0.36]} castShadow>
            <boxGeometry args={[0.05, 0.06, 0.24]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.02, 0.56]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, -0.1, 0.1]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.035, 0.15, 0.07]} />
          </mesh>
          <mesh material={mats.gunMetal} position={[0, 0.08, 0.08]} castShadow>
            <boxGeometry args={[0.03, 0.04, 0.12]} />
          </mesh>
          {setMuzzle(0.67)}
        </group>
      )
  }
}

interface SoldierProps {
  side: 'player' | 'bot'
  weapon: WeaponId
  anim: MutableRefObject<SoldierAnim>
  muzzleRef: MutableRefObject<THREE.Object3D | null>
}

/** Procedural tactical soldier. Origin at the feet, facing +Z. */
export const SoldierModel = forwardRef<THREE.Group, SoldierProps>(function SoldierModel(
  { side, weapon, anim, muzzleRef },
  ref,
) {
  const mats = useMats(PALETTES[side])
  const root = useRef<THREE.Group>(null)
  const upper = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const shinL = useRef<THREE.Group>(null)
  const shinR = useRef<THREE.Group>(null)
  const gun = useRef<THREE.Group>(null)
  const phase = useRef(0)
  const deathT = useRef(0)

  useFrame((_, dt) => {
    const a = anim.current
    const amt = Math.min(1, a.speed / 5)
    phase.current += dt * (4 + a.speed * 1.6)
    const s = Math.sin(phase.current)
    const swing = a.grounded ? s * 0.75 * amt : 0.35
    if (legL.current && legR.current && shinL.current && shinR.current) {
      legL.current.rotation.x = THREE.MathUtils.lerp(legL.current.rotation.x, swing, 0.3)
      legR.current.rotation.x = THREE.MathUtils.lerp(legR.current.rotation.x, a.grounded ? -swing : -0.2, 0.3)
      shinL.current.rotation.x = Math.max(0, -s) * 0.9 * amt + (a.grounded ? 0 : 0.6)
      shinR.current.rotation.x = Math.max(0, s) * 0.9 * amt + (a.grounded ? 0 : 0.3)
    }
    if (upper.current) {
      upper.current.rotation.x = THREE.MathUtils.lerp(upper.current.rotation.x, -a.pitch * 0.6, 0.35)
      upper.current.position.y = Math.abs(Math.cos(phase.current)) * 0.03 * amt
    }
    if (gun.current) {
      a.recoil = Math.max(0, a.recoil - dt * 10)
      gun.current.position.z = 0.42 - a.recoil * 0.06
      gun.current.rotation.x = -a.recoil * 0.15
    }
    if (root.current) {
      if (a.dead) {
        deathT.current = Math.min(1, deathT.current + dt * 2.2)
        const e = 1 - Math.pow(1 - deathT.current, 3)
        root.current.rotation.x = -e * (Math.PI / 2) * 0.96
        root.current.position.y = e * 0.18
      } else {
        deathT.current = 0
        root.current.rotation.x = 0
        root.current.position.y = 0
      }
    }
  })

  return (
    <group ref={ref}>
      <group ref={root}>
        {/* legs */}
        {(
          [
            [legL, shinL, -0.11],
            [legR, shinR, 0.11],
          ] as const
        ).map(([leg, shin, x]) => (
          <group key={x} ref={leg} position={[x, 0.92, 0]}>
            <mesh material={mats.uniform} position={[0, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.3, 4, 10]} />
            </mesh>
            <mesh material={mats.vest} position={[0, -0.2, 0.06]} castShadow>
              <boxGeometry args={[0.1, 0.12, 0.05]} />
            </mesh>
            <group ref={shin} position={[0, -0.44, 0]}>
              <mesh material={mats.uniform} position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.075, 0.28, 4, 10]} />
              </mesh>
              <mesh material={mats.boot} position={[0, -0.43, 0.04]} castShadow>
                <boxGeometry args={[0.12, 0.1, 0.25]} />
              </mesh>
            </group>
          </group>
        ))}
        {/* hips */}
        <mesh material={mats.uniform} position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.34, 0.16, 0.2]} />
        </mesh>
        <mesh material={mats.boot} position={[0, 1.02, 0]}>
          <boxGeometry args={[0.36, 0.04, 0.22]} />
        </mesh>

        <group ref={upper}>
          <group position={[0, 1.05, 0]}>
            {/* torso */}
            <mesh material={mats.uniform} position={[0, 0.23, 0]} castShadow>
              <capsuleGeometry args={[0.17, 0.22, 4, 12]} />
            </mesh>
            <mesh material={mats.vest} position={[0, 0.25, 0.02]} castShadow>
              <boxGeometry args={[0.38, 0.38, 0.28]} />
            </mesh>
            {[-0.1, 0, 0.1].map((x) => (
              <mesh key={x} material={mats.vest} position={[x, 0.15, 0.17]} castShadow>
                <boxGeometry args={[0.08, 0.12, 0.06]} />
              </mesh>
            ))}
            <mesh material={mats.accent} position={[0.16, 0.36, 0.0]}>
              <boxGeometry args={[0.07, 0.07, 0.29]} />
            </mesh>
            <mesh material={mats.vest} position={[0, 0.3, -0.18]} castShadow>
              <boxGeometry args={[0.28, 0.3, 0.1]} />
            </mesh>
            {/* head */}
            <mesh material={mats.skin} position={[0, 0.58, 0]} castShadow>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
            </mesh>
            <mesh material={mats.skin} position={[0, 0.69, 0.01]} castShadow>
              <sphereGeometry args={[0.115, 16, 12]} />
            </mesh>
            <mesh material={mats.helmet} position={[0, 0.73, 0]} castShadow>
              <sphereGeometry args={[0.135, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            <mesh material={mats.helmet} position={[0, 0.73, 0]}>
              <cylinderGeometry args={[0.145, 0.145, 0.025, 16]} />
            </mesh>
            <mesh material={mats.visor} position={[0, 0.69, 0.095]}>
              <boxGeometry args={[0.18, 0.05, 0.04]} />
            </mesh>
            {/* arms: right holds grip, left supports barrel */}
            <group position={[0.22, 0.42, 0]} rotation={[-1.25, 0, -0.15]}>
              <mesh material={mats.uniform} position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.065, 0.2, 4, 8]} />
              </mesh>
              <group position={[0, -0.28, 0]} rotation={[0.9, 0, 0.3]}>
                <mesh material={mats.uniform} position={[0, -0.12, 0]} castShadow>
                  <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
                </mesh>
                <mesh material={mats.boot} position={[0, -0.25, 0]}>
                  <sphereGeometry args={[0.055, 8, 6]} />
                </mesh>
              </group>
            </group>
            <group position={[-0.22, 0.42, 0]} rotation={[-1.45, 0, 0.45]}>
              <mesh material={mats.uniform} position={[0, -0.14, 0]} castShadow>
                <capsuleGeometry args={[0.065, 0.2, 4, 8]} />
              </mesh>
              <group position={[0, -0.28, 0]} rotation={[0.3, 0, -0.5]}>
                <mesh material={mats.uniform} position={[0, -0.13, 0]} castShadow>
                  <capsuleGeometry args={[0.055, 0.2, 4, 8]} />
                </mesh>
                <mesh material={mats.boot} position={[0, -0.27, 0]}>
                  <sphereGeometry args={[0.055, 8, 6]} />
                </mesh>
              </group>
            </group>
            <group ref={gun} position={[0.06, 0.35, 0.42]}>
              <GunModel weapon={weapon} mats={mats} muzzleRef={muzzleRef} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
})
