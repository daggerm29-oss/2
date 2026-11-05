'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const TRACER_COUNT = 24
const IMPACT_COUNT = 32
const FLASH_COUNT = 2

interface Tracer {
  from: THREE.Vector3
  to: THREE.Vector3
  life: number
}
interface Impact {
  pos: THREE.Vector3
  normal: THREE.Vector3
  life: number
  blood: boolean
}
interface Flash {
  pos: THREE.Vector3
  life: number
}

const tracers: Tracer[] = Array.from({ length: TRACER_COUNT }, () => ({
  from: new THREE.Vector3(),
  to: new THREE.Vector3(),
  life: 0,
}))
const impacts: Impact[] = Array.from({ length: IMPACT_COUNT }, () => ({
  pos: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  life: 0,
  blood: false,
}))
const flashes: Flash[] = Array.from({ length: FLASH_COUNT }, () => ({ pos: new THREE.Vector3(), life: 0 }))
let tracerIdx = 0
let impactIdx = 0
let flashIdx = 0

export const fx = {
  tracer(from: THREE.Vector3, to: THREE.Vector3) {
    const t = tracers[tracerIdx++ % TRACER_COUNT]
    t.from.copy(from)
    t.to.copy(to)
    t.life = 1
  },
  impact(pos: THREE.Vector3, normal: THREE.Vector3, blood = false) {
    const i = impacts[impactIdx++ % IMPACT_COUNT]
    i.pos.copy(pos)
    i.normal.copy(normal)
    i.life = 1
    i.blood = blood
  },
  muzzle(pos: THREE.Vector3) {
    const f = flashes[flashIdx++ % FLASH_COUNT]
    f.pos.copy(pos)
    f.life = 1
  },
}

const tmpMid = new THREE.Vector3()
const tmpDir = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const tmpQuat = new THREE.Quaternion()

export function Effects() {
  const tracerRefs = useRef<(THREE.Mesh | null)[]>([])
  const impactRefs = useRef<(THREE.Mesh | null)[]>([])
  const flashRefs = useRef<(THREE.Group | null)[]>([])
  const lightRefs = useRef<(THREE.PointLight | null)[]>([])

  const tracerGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 1, 5, 1, true), [])
  const tracerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(4, 3.2, 1.6),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  const impactGeo = useMemo(() => new THREE.CircleGeometry(0.09, 8), [])
  const sparkMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(3, 2.2, 1),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const bloodMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#a0101a',
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const flashMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(6, 4, 1.5),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const flashGeo = useMemo(() => new THREE.PlaneGeometry(0.35, 0.35), [])

  useFrame((state, dt) => {
    for (let i = 0; i < TRACER_COUNT; i++) {
      const t = tracers[i]
      const m = tracerRefs.current[i]
      if (!m) continue
      if (t.life <= 0) {
        m.visible = false
        continue
      }
      t.life -= dt * 14
      m.visible = true
      tmpDir.subVectors(t.to, t.from)
      const len = tmpDir.length()
      tmpMid.addVectors(t.from, t.to).multiplyScalar(0.5)
      m.position.copy(tmpMid)
      tmpQuat.setFromUnitVectors(up, tmpDir.normalize())
      m.quaternion.copy(tmpQuat)
      m.scale.set(1, len, 1)
    }
    for (let i = 0; i < IMPACT_COUNT; i++) {
      const p = impacts[i]
      const m = impactRefs.current[i]
      if (!m) continue
      if (p.life <= 0) {
        m.visible = false
        continue
      }
      p.life -= dt * (p.blood ? 2.5 : 5)
      m.visible = true
      m.material = p.blood ? bloodMat : sparkMat
      m.position.copy(p.pos).addScaledVector(p.normal, 0.02)
      m.lookAt(tmpMid.copy(m.position).add(p.normal))
      const s = p.blood ? 1 + (1 - p.life) * 2 : 0.6 + p.life
      m.scale.setScalar(s)
    }
    for (let i = 0; i < FLASH_COUNT; i++) {
      const f = flashes[i]
      const g = flashRefs.current[i]
      const l = lightRefs.current[i]
      if (!g || !l) continue
      if (f.life <= 0) {
        g.visible = false
        l.intensity = 0
        continue
      }
      f.life -= dt * 22
      g.visible = true
      g.position.copy(f.pos)
      g.quaternion.copy(state.camera.quaternion)
      g.rotateZ(Math.random() * Math.PI)
      g.scale.setScalar(0.6 + Math.random() * 0.6)
      l.position.copy(f.pos)
      l.intensity = Math.max(0, f.life) * 12
    }
  })

  return (
    <group>
      {tracers.map((_, i) => (
        <mesh
          key={`t${i}`}
          ref={(el) => {
            tracerRefs.current[i] = el
          }}
          geometry={tracerGeo}
          material={tracerMat}
          visible={false}
          frustumCulled={false}
        />
      ))}
      {impacts.map((_, i) => (
        <mesh
          key={`i${i}`}
          ref={(el) => {
            impactRefs.current[i] = el
          }}
          geometry={impactGeo}
          material={sparkMat}
          visible={false}
        />
      ))}
      {flashes.map((_, i) => (
        <group key={`f${i}`}>
          <group
            ref={(el) => {
              flashRefs.current[i] = el
            }}
            visible={false}
          >
            <mesh geometry={flashGeo} material={flashMat} />
          </group>
          <pointLight
            ref={(el) => {
              lightRefs.current[i] = el
            }}
            color="#ffb455"
            intensity={0}
            distance={6}
            decay={2}
          />
        </group>
      ))}
    </group>
  )
}
