'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { CAPSULE, FOOT_OFFSET, runtime } from './runtime'
import { SoldierModel, type SoldierAnim } from './soldier-model'
import { useGame, type Difficulty } from './store'
import { WEAPONS, damageAtDistance, type WeaponId } from './weapons'
import { fx } from './effects'

const SKILL: Record<Difficulty, { reaction: number; accuracy: number; head: number; speed: number }> = {
  easy: { reaction: 0.75, accuracy: 0.28, head: 0.05, speed: 3.8 },
  normal: { reaction: 0.45, accuracy: 0.46, head: 0.12, speed: 4.6 },
  hard: { reaction: 0.26, accuracy: 0.62, head: 0.22, speed: 5.3 },
}

const PREFERRED: Record<WeaponId, number> = {
  m1887: 4,
  mp40: 8,
  deagle: 12,
  m4a1: 14,
  woodpecker: 22,
}

const eye = new THREE.Vector3()
const target = new THREE.Vector3()
const toPlayer = new THREE.Vector3()
const flat = new THREE.Vector3()
const perp = new THREE.Vector3()
const desired = new THREE.Vector3()
const muzzle = new THREE.Vector3()
const missPoint = new THREE.Vector3()
const n = new THREE.Vector3()

export function Bot({ spawn, yaw: initialYaw }: { spawn: THREE.Vector3; yaw: number }) {
  const body = useRef<RapierRigidBody>(null)
  const model = useRef<THREE.Group>(null)
  const muzzleRef = useRef<THREE.Object3D | null>(null)
  const anim = useRef<SoldierAnim>({ speed: 0, pitch: 0, dead: false, grounded: true, recoil: 0 })
  const weaponId = useGame((s) => s.weaponId)
  const { world, rapier } = useRapier()

  const ai = useRef({
    yaw: initialYaw,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    strafeTimer: 1,
    reaction: 0,
    fireCooldown: 0.5,
    ammo: WEAPONS[weaponId].magSize,
    reload: 0,
    stuck: 0,
    avoidTimer: 0,
    avoidDir: 1,
    lastSeen: new THREE.Vector3(),
    hasSeen: false,
    jumpCooldown: 2,
  })

  useFrame((_, rawDt) => {
    const rb = body.current
    if (!rb) return
    runtime.botBody = rb
    const dt = Math.min(rawDt, 0.05)
    const g = useGame.getState()
    const s = ai.current
    const weapon = WEAPONS[g.weaponId]
    const skill = SKILL[g.difficulty]
    const alive = g.hp.bot > 0
    const active = g.phase === 'playing' && alive
    const p = rb.translation()
    const v = rb.linvel()
    runtime.botPos.set(p.x, p.y, p.z)

    eye.set(p.x, p.y + 0.7, p.z)
    target.copy(runtime.playerPos).add(n.set(0, 0.35, 0))
    toPlayer.subVectors(target, eye)
    const dist = toPlayer.length()
    toPlayer.normalize()

    let visible = false
    if (runtime.playerBody && g.hp.player > 0) {
      const ray = new rapier.Ray(eye, toPlayer)
      const hit = world.castRay(ray, dist + 0.5, true, undefined, undefined, undefined, rb)
      visible = !!hit && hit.collider.parent()?.handle === runtime.playerBody.handle
    }
    if (visible) {
      s.lastSeen.copy(runtime.playerPos)
      s.hasSeen = true
    }

    const groundHit = world.castRay(
      new rapier.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 }),
      FOOT_OFFSET + 0.12,
      true,
      undefined,
      undefined,
      undefined,
      rb,
    )
    const grounded = !!groundHit

    let vx = 0
    let vz = 0
    let vy = v.y
    if (active) {
      const pref = PREFERRED[g.weaponId]
      const goal = s.hasSeen && !visible ? s.lastSeen : runtime.playerPos
      flat.set(goal.x - p.x, 0, goal.z - p.z)
      const flatDist = flat.length()
      flat.normalize()
      perp.set(-flat.z, 0, flat.x)

      s.strafeTimer -= dt
      if (s.strafeTimer <= 0) {
        s.strafeDir *= -1
        s.strafeTimer = 0.6 + Math.random() * 1.4
      }

      desired.set(0, 0, 0)
      if (visible) {
        const approach = dist > pref + 2 ? 1 : dist < pref - 2 ? -0.7 : 0
        desired.addScaledVector(flat, approach).addScaledVector(perp, s.strafeDir * 0.85)
      } else if (flatDist > 1.5) {
        desired.copy(flat)
      }
      if (desired.lengthSq() > 0.0001) desired.normalize()

      if (s.avoidTimer > 0) {
        s.avoidTimer -= dt
        desired.set(-desired.z * s.avoidDir, 0, desired.x * s.avoidDir).normalize().addScaledVector(flat, 0.3)
      } else if (desired.lengthSq() > 0.01) {
        const feeler = world.castRay(
          new rapier.Ray({ x: p.x, y: p.y - 0.3, z: p.z }, { x: desired.x, y: 0, z: desired.z }),
          1.3,
          true,
          undefined,
          undefined,
          undefined,
          rb,
        )
        if (feeler && feeler.collider.parent()?.handle !== runtime.playerBody?.handle) {
          s.avoidDir = Math.random() > 0.5 ? 1 : -1
          s.avoidTimer = 0.7 + Math.random() * 0.5
        }
      }

      const speed = skill.speed * (visible ? 0.85 : 1)
      vx = THREE.MathUtils.lerp(v.x, desired.x * speed, Math.min(1, dt * 10))
      vz = THREE.MathUtils.lerp(v.z, desired.z * speed, Math.min(1, dt * 10))

      const wants = desired.lengthSq() > 0.1
      if (wants && Math.hypot(v.x, v.z) < 0.6) s.stuck += dt
      else s.stuck = Math.max(0, s.stuck - dt)
      s.jumpCooldown -= dt
      if (s.stuck > 0.45) {
        s.avoidDir *= -1
        s.avoidTimer = 1
        s.stuck = 0
        if (grounded && s.jumpCooldown <= 0) {
          vy = 6.5
          s.jumpCooldown = 1.5
        }
      }
      if (visible && grounded && s.jumpCooldown <= 0 && Math.random() < dt * 0.25) {
        vy = 6.5
        s.jumpCooldown = 2.5
      }

      // face
      const faceDir = visible ? toPlayer : desired.lengthSq() > 0.01 ? desired : flat
      const targetYaw = Math.atan2(faceDir.x, faceDir.z)
      let dy = targetYaw - s.yaw
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      s.yaw += dy * Math.min(1, dt * 10)

      // combat
      if (s.reload > 0) {
        s.reload -= dt
        if (s.reload <= 0) s.ammo = weapon.magSize
      }
      s.fireCooldown -= dt
      if (visible) s.reaction += dt
      else s.reaction = Math.max(0, s.reaction - dt * 0.6)

      if (
        visible &&
        s.reaction > skill.reaction &&
        s.fireCooldown <= 0 &&
        s.reload <= 0 &&
        dist < weapon.range &&
        Math.abs(dy) < 0.35
      ) {
        if (s.ammo <= 0) {
          s.reload = weapon.reloadTime
        } else {
          s.ammo -= 1
          s.fireCooldown = weapon.fireInterval * (weapon.automatic ? 1.15 : 1.25)
          if (muzzleRef.current) muzzleRef.current.getWorldPosition(muzzle)
          else muzzle.copy(eye)
          fx.muzzle(muzzle)
          anim.current.recoil = 1
          const playerSpeed = Math.hypot(runtime.playerVel.x, runtime.playerVel.z)
          const rangeFactor = 1 - Math.min(0.75, dist / weapon.range)
          const moveFactor = playerSpeed > 5.5 ? 0.7 : playerSpeed > 1 ? 0.85 : 1
          const playerAiming = g.aiming ? 0.9 : 1
          const chance = skill.accuracy * rangeFactor * moveFactor * playerAiming * (weapon.pellets > 1 ? 1.4 : 1)
          let dmg = 0
          for (let i = 0; i < weapon.pellets; i++) {
            if (Math.random() < chance) {
              const head = Math.random() < skill.head
              dmg += damageAtDistance(weapon, dist, head)
              if (i < 2) {
                missPoint.copy(target).add(n.set((Math.random() - 0.5) * 0.3, head ? 0.25 : 0, (Math.random() - 0.5) * 0.3))
                fx.tracer(muzzle, missPoint)
              }
            } else if (i < 2) {
              missPoint
                .copy(target)
                .add(n.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.3) * 1.6, (Math.random() - 0.5) * 2.4))
              const dir = missPoint.clone().sub(muzzle).normalize()
              const miss = world.castRayAndGetNormal(
                new rapier.Ray(muzzle, dir),
                weapon.range,
                true,
                undefined,
                undefined,
                undefined,
                rb,
              )
              if (miss && miss.collider.parent()?.handle !== runtime.playerBody?.handle) {
                missPoint.copy(muzzle).addScaledVector(dir, miss.timeOfImpact)
                fx.impact(missPoint, n.set(miss.normal.x, miss.normal.y, miss.normal.z))
              } else {
                missPoint.copy(muzzle).addScaledVector(dir, Math.min(weapon.range, dist + 15))
              }
              fx.tracer(muzzle, missPoint)
            }
          }
          if (dmg > 0) {
            g.applyDamage('player', Math.round(dmg), false)
            runtime.cameraShake = 1
          }
        }
      }
    }
    rb.setLinvel({ x: vx, y: vy, z: vz }, true)

    if (model.current) {
      model.current.position.set(p.x, p.y - FOOT_OFFSET, p.z)
      model.current.rotation.y = s.yaw
    }
    anim.current.speed = Math.hypot(vx, vz)
    anim.current.pitch = visible ? Math.asin(THREE.MathUtils.clamp(toPlayer.y, -1, 1)) : 0
    anim.current.grounded = grounded
    anim.current.dead = !alive
  })

  return (
    <>
      <RigidBody
        ref={body}
        position={spawn}
        colliders={false}
        enabledRotations={[false, false, false]}
        canSleep={false}
        linearDamping={0}
      >
        <CapsuleCollider args={[CAPSULE.halfHeight, CAPSULE.radius]} friction={0} />
      </RigidBody>
      <SoldierModel ref={model} side="bot" weapon={weaponId} anim={anim} muzzleRef={muzzleRef} />
    </>
  )
}
