import * as THREE from 'three'
import type { RapierRigidBody } from '@react-three/rapier'

/** Mutable, non-reactive per-frame state shared between scene systems. */
export const runtime = {
  playerBody: null as RapierRigidBody | null,
  botBody: null as RapierRigidBody | null,
  playerPos: new THREE.Vector3(),
  botPos: new THREE.Vector3(),
  playerVel: new THREE.Vector3(),
  cameraShake: 0,
}

/** Shared input state written by keyboard/mouse and touch controls, consumed by the player controller. */
export const input = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  fire: false,
  sprint: false,
  jumpQueued: false,
  reloadQueued: false,
  keys: new Set<string>(),
}

export function consumeLook() {
  const x = input.lookX
  const y = input.lookY
  input.lookX = 0
  input.lookY = 0
  return { x, y }
}

export const SPAWNS = {
  a: new THREE.Vector3(0, 1.2, 21),
  b: new THREE.Vector3(0, 1.2, -21),
}

export const CAPSULE = { halfHeight: 0.5, radius: 0.35 }
/** Height from capsule center to the feet. */
export const FOOT_OFFSET = CAPSULE.halfHeight + CAPSULE.radius

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  ;(window as unknown as { __lw: typeof runtime }).__lw = runtime
}
