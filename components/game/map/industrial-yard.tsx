'use client'

import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

type MatKind = 'concrete' | 'brick' | 'container' | 'crate' | 'barrier' | 'steel' | 'yellow'
type Vec3 = [number, number, number]

interface BoxItem {
  pos: Vec3
  size: Vec3
  mat: MatKind
  color?: string
  rotY?: number
}

const ARENA = 25
const WALL_H = 4.5
const CONTAINER: Vec3 = [2.44, 2.6, 6.06]

const geoCache = new Map<string, THREE.BoxGeometry>()
function boxGeo(w: number, h: number, d: number, tile: number) {
  const key = `${w}|${h}|${d}|${tile}`
  const cached = geoCache.get(key)
  if (cached) return cached
  const g = new THREE.BoxGeometry(w, h, d)
  if (tile > 0) {
    const uv = g.attributes.uv as THREE.BufferAttribute
    const dims = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ]
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v
        uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile)
      }
    }
    uv.needsUpdate = true
  }
  geoCache.set(key, g)
  return g
}

const TILE: Record<MatKind, number> = {
  concrete: 4,
  brick: 3,
  container: 2.6,
  crate: 0,
  barrier: 2,
  steel: 0,
  yellow: 0,
}

/** Mirror through the arena center so both spawns get identical cover. */
function sym(items: BoxItem[]): BoxItem[] {
  return items.flatMap((it) => [
    it,
    { ...it, pos: [-it.pos[0], it.pos[1], -it.pos[2]] as Vec3, rotY: it.rotY ? it.rotY + Math.PI : it.rotY },
  ])
}

function useMaterials() {
  const [concrete, brick, container, crate] = useTexture([
    '/textures/concrete.jpg',
    '/textures/brick.jpg',
    '/textures/container.jpg',
    '/textures/crate.jpg',
  ])
  return useMemo(() => {
    for (const t of [concrete, brick, container, crate]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
    }
    const base = (opts: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(opts)
    const containerCache = new Map<string, THREE.MeshStandardMaterial>()
    return {
      concrete: base({ map: concrete, bumpMap: concrete, bumpScale: 1.2, roughness: 0.95, metalness: 0 }),
      brick: base({ map: brick, bumpMap: brick, bumpScale: 2, roughness: 0.92 }),
      crate: base({ map: crate, bumpMap: crate, bumpScale: 1.5, roughness: 0.85 }),
      barrier: base({ map: concrete, bumpMap: concrete, color: '#d9d4cb', roughness: 0.9 }),
      steel: base({ color: '#5d646b', roughness: 0.45, metalness: 0.8 }),
      yellow: base({ color: '#d6a419', roughness: 0.55, metalness: 0.5 }),
      container: (color: string) => {
        let m = containerCache.get(color)
        if (!m) {
          m = base({
            map: container,
            bumpMap: container,
            bumpScale: 2.5,
            color,
            roughness: 0.6,
            metalness: 0.35,
          })
          containerCache.set(color, m)
        }
        return m
      },
      ground: (() => {
        const t = concrete.clone()
        t.repeat.set(36, 36)
        t.needsUpdate = true
        return base({ map: t, bumpMap: t, bumpScale: 1, roughness: 0.97, color: '#c9c4bc' })
      })(),
    }
  }, [concrete, brick, container, crate])
}

type Materials = ReturnType<typeof useMaterials>

function materialFor(m: Materials, kind: MatKind, color?: string): THREE.Material {
  if (kind === 'container') return m.container(color ?? '#8a3a2a')
  return m[kind]
}

function Box({ item, mats, collide = true }: { item: BoxItem; mats: Materials; collide?: boolean }) {
  const [w, h, d] = item.size
  const mesh = (
    <mesh
      geometry={boxGeo(w, h, d, TILE[item.mat])}
      material={materialFor(mats, item.mat, item.color)}
      castShadow
      receiveShadow
    />
  )
  if (!collide) {
    return (
      <group position={item.pos} rotation={[0, item.rotY ?? 0, 0]}>
        {mesh}
      </group>
    )
  }
  return (
    <RigidBody type="fixed" colliders={false} position={item.pos} rotation={[0, item.rotY ?? 0, 0]}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} friction={0.4} />
      {mesh}
    </RigidBody>
  )
}

function Container({ pos, rotY = 0, color, mats }: { pos: Vec3; rotY?: number; color: string; mats: Materials }) {
  const [w, h, d] = CONTAINER
  return (
    <RigidBody type="fixed" colliders={false} position={pos} rotation={[0, rotY, 0]}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} friction={0.4} />
      <mesh geometry={boxGeo(w, h, d, TILE.container)} material={mats.container(color)} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, (s * d) / 2 + s * 0.01]} material={mats.steel} castShadow>
          <boxGeometry args={[w + 0.04, h + 0.04, 0.06]} />
        </mesh>
      ))}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 0, d / 2 + 0.06]} material={mats.steel}>
          <cylinderGeometry args={[0.03, 0.03, h - 0.2, 6]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

function Barrel({ pos, color, mats }: { pos: Vec3; color: string; mats: Materials }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 }), [color])
  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <CylinderCollider args={[0.45, 0.32]} />
      <mesh material={mat} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.9, 20]} />
      </mesh>
      {[-0.22, 0.22].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.steel}>
          <torusGeometry args={[0.325, 0.018, 6, 24]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

function LightPole({ pos, mats }: { pos: Vec3; mats: Materials }) {
  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <CylinderCollider args={[4, 0.12]} position={[0, 4, 0]} />
      <mesh position={[0, 4, 0]} material={mats.steel} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 8, 10]} />
      </mesh>
      <mesh position={[0.6, 8, 0]} material={mats.steel} castShadow>
        <boxGeometry args={[1.4, 0.08, 0.08]} />
      </mesh>
      <mesh position={[1.2, 7.92, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.3]} />
        <meshStandardMaterial color="#222" emissive="#fff4d6" emissiveIntensity={1.4} />
      </mesh>
    </RigidBody>
  )
}

function Crane({ pos, mats }: { pos: Vec3; mats: Materials }) {
  const legs: Vec3[] = [
    [-7, 9, -3],
    [7, 9, -3],
    [-7, 9, 3],
    [7, 9, 3],
  ]
  return (
    <group position={pos}>
      {legs.map((p, i) => (
        <mesh key={i} position={p} material={mats.yellow} castShadow>
          <boxGeometry args={[0.8, 18, 0.8]} />
        </mesh>
      ))}
      <mesh position={[0, 18.5, -3]} material={mats.yellow} castShadow>
        <boxGeometry args={[16, 1.2, 1]} />
      </mesh>
      <mesh position={[0, 18.5, 3]} material={mats.yellow} castShadow>
        <boxGeometry args={[16, 1.2, 1]} />
      </mesh>
      <mesh position={[2, 17.6, 0]} material={mats.steel} castShadow>
        <boxGeometry args={[2.5, 1.6, 7]} />
      </mesh>
      <mesh position={[2, 12, 0]} material={mats.steel}>
        <cylinderGeometry args={[0.04, 0.04, 10, 4]} />
      </mesh>
    </group>
  )
}

const containers: { pos: Vec3; rotY?: number; color: string }[] = [
  { pos: [0, 1.3, 0], rotY: Math.PI / 2, color: '#2f5d7c' },
  { pos: [-12, 1.3, 9], color: '#9b3b2a' },
  { pos: [12, 1.3, -9], color: '#9b3b2a' },
  { pos: [-18.5, 1.3, -4], color: '#3f6b3a' },
  { pos: [-18.5, 3.9, -4], color: '#c08a2e' },
  { pos: [18.5, 1.3, 4], color: '#3f6b3a' },
  { pos: [18.5, 3.9, 4], color: '#c08a2e' },
  { pos: [7, 1.3, 15.5], rotY: Math.PI / 2, color: '#7a7f84' },
  { pos: [-7, 1.3, -15.5], rotY: Math.PI / 2, color: '#7a7f84' },
]

const coverItems: BoxItem[] = sym([
  { pos: [5.5, 0.45, 9], size: [3.2, 0.9, 0.5], mat: 'barrier' },
  { pos: [-4, 0.45, 4.5], size: [3.2, 0.9, 0.5], mat: 'barrier', rotY: 0.4 },
  { pos: [-3.6, 0.6, 15], size: [1.2, 1.2, 1.2], mat: 'crate' },
  { pos: [-2.3, 0.6, 15.3], size: [1.2, 1.2, 1.2], mat: 'crate', rotY: 0.2 },
  { pos: [-3.0, 1.8, 15.1], size: [1.2, 1.2, 1.2], mat: 'crate', rotY: -0.15 },
  { pos: [12.5, 0.6, 2.5], size: [1.2, 1.2, 1.2], mat: 'crate' },
  { pos: [3.4, 0.6, 1.4], size: [1.2, 1.2, 1.2], mat: 'crate', rotY: 0.3 },
  // ruined guard post
  { pos: [-12, 1.5, -13.5], size: [5, 3, 0.4], mat: 'brick' },
  { pos: [-14.3, 1.5, -11.5], size: [0.4, 3, 4], mat: 'brick' },
  { pos: [-9.7, 0.9, -11.8], size: [0.4, 1.8, 2.5], mat: 'brick' },
  // low wall mid-lane
  { pos: [14, 0.6, 12], size: [4, 1.2, 0.45], mat: 'brick' },
])

const perimeter: BoxItem[] = [
  { pos: [0, WALL_H / 2, ARENA], size: [ARENA * 2 + 0.6, WALL_H, 0.6], mat: 'brick' },
  { pos: [0, WALL_H / 2, -ARENA], size: [ARENA * 2 + 0.6, WALL_H, 0.6], mat: 'brick' },
  { pos: [ARENA, WALL_H / 2, 0], size: [0.6, WALL_H, ARENA * 2], mat: 'brick' },
  { pos: [-ARENA, WALL_H / 2, 0], size: [0.6, WALL_H, ARENA * 2], mat: 'brick' },
]

const backdrop: BoxItem[] = [
  { pos: [0, 7, -40], size: [44, 14, 12], mat: 'container', color: '#8d949a' },
  { pos: [-38, 6, 6], size: [12, 12, 34], mat: 'container', color: '#6f7a72' },
  { pos: [36, 9, -10], size: [12, 18, 26], mat: 'container', color: '#9a8f84' },
  { pos: [12, 5, 40], size: [36, 10, 12], mat: 'container', color: '#7d8791' },
  { pos: [-30, 1.3, 32], size: [6.06, 2.6, 2.44], mat: 'container', color: '#9b3b2a' },
  { pos: [-30, 3.9, 32], size: [6.06, 2.6, 2.44], mat: 'container', color: '#2f5d7c' },
  { pos: [33, 1.3, 30], size: [6.06, 2.6, 2.44], mat: 'container', color: '#c08a2e' },
]

export function IndustrialYard() {
  const mats = useMaterials()

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[80, 0.5, 80]} position={[0, -0.5, 0]} friction={1} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mats.ground}>
          <planeGeometry args={[160, 160]} />
        </mesh>
      </RigidBody>

      {/* painted lane markings */}
      {[-8, 8].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]} receiveShadow>
          <planeGeometry args={[0.18, 44]} />
          <meshStandardMaterial color="#d8b63a" roughness={0.9} transparent opacity={0.55} />
        </mesh>
      ))}

      {perimeter.map((it, i) => (
        <Box key={`p${i}`} item={it} mats={mats} />
      ))}
      {perimeter.map((it, i) => (
        <Box
          key={`cap${i}`}
          collide={false}
          item={{
            pos: [it.pos[0], WALL_H + 0.08, it.pos[2]],
            size: [it.size[0] + 0.15, 0.16, it.size[2] + 0.15],
            mat: 'barrier',
          }}
          mats={mats}
        />
      ))}

      {containers.map((c, i) => (
        <Container key={`c${i}`} pos={c.pos} rotY={c.rotY} color={c.color} mats={mats} />
      ))}
      {coverItems.map((it, i) => (
        <Box key={`b${i}`} item={it} mats={mats} />
      ))}

      {(
        [
          [9, 0.45, 4, '#2c5a87'],
          [9.7, 0.45, 4.6, '#8c2a1f'],
          [-9, 0.45, -4, '#2c5a87'],
          [-9.7, 0.45, -4.6, '#8c2a1f'],
          [-21, 0.45, 18, '#3c6e3a'],
          [21, 0.45, -18, '#3c6e3a'],
        ] as [number, number, number, string][]
      ).map(([x, y, z, c], i) => (
        <Barrel key={`br${i}`} pos={[x, y, z]} color={c} mats={mats} />
      ))}

      {(
        [
          [-23.5, 0, 23.5],
          [23.5, 0, -23.5],
          [23.5, 0, 23.5],
          [-23.5, 0, -23.5],
        ] as Vec3[]
      ).map((p, i) => (
        <LightPole key={`lp${i}`} pos={p} mats={mats} />
      ))}

      {backdrop.map((it, i) => (
        <Box key={`bd${i}`} item={it} mats={mats} collide={false} />
      ))}
      <Crane pos={[-6, 0, -33]} mats={mats} />
    </group>
  )
}
