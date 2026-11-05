'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { CAPSULE, FOOT_OFFSET, consumeLook, input, runtime } from './runtime'
import { SoldierModel, type SoldierAnim } from './soldier-model'
import { useGame } from './store'
import { WEAPONS, damageAtDistance } from './weapons'
import { fx } from './effects'
import { haptic } from '@/lib/telegram'

const WALK = 5
const SPRINT = 7.2
const ADS_WALK = 3
const JUMP = 7
const BASE_FOV = 72

const fwd = new THREE.Vector3()
const right = new THREE.Vector3()
const move = new THREE.Vector3()
const pivot = new THREE.Vector3()
const camTarget = new THREE.Vector3()
const aimDir = new THREE.Vector3()
const hitPoint = new THREE.Vector3()
const hitNormal = new THREE.Vector3()
const muzzle = new THREE.Vector3()
const tmp = new THREE.Vector3()

export function Player({ spawn, yaw: initialYaw }: { spawn: THREE.Vector3; yaw: number }) {
  const body = useRef<RapierRigidBody>(null)
  const model = useRef<THREE.Group>(null)
  const muzzleRef = useRef<THREE.Object3D | null>(null)
  const anim = useRef<SoldierAnim>({ speed: 0, pitch: 0, dead: false, grounded: true, recoil: 0 })
  const yaw = useRef(initialYaw)
  const pitch = useRef(-0.05)
  const camDist = useRef(3)
  const fireCooldown = useRef(0)
  const reloadLeft = useRef(0)
  const ammo = useRef(0)
  const shake = useRef(0)
  const { camera } = useThree()
  const { world, rapier } = useRapier()
  const weaponId = useGame((s) => s.weaponId)

  useEffect(() => {
    runtime.playerBody = body.current
    ammo.current = WEAPONS[weaponId].magSize
    return () => {
      if (runtime.playerBody === body.current) runtime.playerBody = null
    }
  }, [weaponId])

  useFrame((_, rawDt) => {
    const rb = body.current
    if (!rb) return
    runtime.playerBody = rb
    const dt = Math.min(rawDt, 0.05)
    const game = useGame.getState()
    const weapon = WEAPONS[game.weaponId]
    const alive = game.hp.player > 0
    const canAct = game.phase === 'playing' && alive
    const canLook = (game.phase === 'playing' || game.phase === 'countdown') && alive
    const aiming = game.aiming && canAct

    // look
    const look = consumeLook()
    if (canLook) {
      const sens = 0.0022 * game.sensitivity * (aiming ? weapon.adsFov / BASE_FOV : 1)
      yaw.current -= look.x * sens
      pitch.current = THREE.MathUtils.clamp(pitch.current - look.y * sens, -1.15, 0.95)
    }

    // movement
    const p = rb.translation()
    const v = rb.linvel()
    fwd.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    right.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current))
    const k = input.keys
    const mx = THREE.MathUtils.clamp(input.moveX + (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0), -1, 1)
    const my = THREE.MathUtils.clamp(input.moveY + (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0), -1, 1)
    move.set(0, 0, 0).addScaledVector(right, mx).addScaledVector(fwd, my)
    if (move.lengthSq() > 1) move.normalize()
    const sprinting = (input.sprint || k.has('ShiftLeft')) && my > 0.5 && !aiming
    const speed = aiming ? ADS_WALK : sprinting ? SPRINT : WALK

    const groundRay = new rapier.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 })
    const groundHit = world.castRay(groundRay, FOOT_OFFSET + 0.12, true, undefined, undefined, undefined, rb)
    const grounded = !!groundHit

    let vy = v.y
    if (canAct && grounded && (input.jumpQueued || k.has('Space'))) {
      vy = JUMP
    }
    input.jumpQueued = false
    const control = grounded ? 1 : 0.35
    const tx = canAct ? move.x * speed : 0
    const tz = canAct ? move.z * speed : 0
    const nx = THREE.MathUtils.lerp(v.x, tx, Math.min(1, dt * 14 * control))
    const nz = THREE.MathUtils.lerp(v.z, tz, Math.min(1, dt * 14 * control))
    rb.setLinvel({ x: nx, y: vy, z: nz }, true)

    runtime.playerPos.set(p.x, p.y, p.z)
    runtime.playerVel.set(nx, vy, nz)

    // reload
    if (reloadLeft.current > 0) {
      reloadLeft.current -= dt
      if (reloadLeft.current <= 0) {
        ammo.current = weapon.magSize
        game.setAmmo(ammo.current)
        game.setReloading(false)
      }
    } else if (canAct && (input.reloadQueued || k.has('KeyR')) && ammo.current < weapon.magSize) {
      reloadLeft.current = weapon.reloadTime
      game.setReloading(true)
    }
    input.reloadQueued = false

    // camera
    const shoulder = aiming ? 0.5 : 0.78
    const targetDist = aiming ? 1.5 : 3.2
    pivot.set(p.x, p.y + (aiming ? 0.8 : 0.95), p.z).addScaledVector(right, shoulder)
    aimDir.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    const camRay = new rapier.Ray(pivot, { x: -aimDir.x, y: -aimDir.y, z: -aimDir.z })
    const camHit = world.castRay(camRay, targetDist + 0.25, true, undefined, undefined, undefined, rb)
    const allowed = camHit ? Math.max(0.3, camHit.timeOfImpact - 0.25) : targetDist
    camDist.current = allowed < camDist.current ? allowed : THREE.MathUtils.lerp(camDist.current, allowed, dt * 8)
    camTarget.copy(pivot).addScaledVector(aimDir, -camDist.current)
    shake.current = Math.max(0, shake.current - dt * 6) + runtime.cameraShake
    runtime.cameraShake = 0
    camera.position.copy(camTarget)
    camera.rotation.set(
      pitch.current + (Math.random() - 0.5) * shake.current * 0.02,
      yaw.current + (Math.random() - 0.5) * shake.current * 0.02,
      0,
      'YXZ',
    )
    const persp = camera as THREE.PerspectiveCamera
    const fov = aiming ? weapon.adsFov : sprinting ? BASE_FOV + 4 : BASE_FOV
    if (Math.abs(persp.fov - fov) > 0.05) {
      persp.fov = THREE.MathUtils.lerp(persp.fov, fov, Math.min(1, dt * 12))
      persp.updateProjectionMatrix()
    }

    // shooting
    fireCooldown.current -= dt
    if (canAct && input.fire && fireCooldown.current <= 0 && reloadLeft.current <= 0) {
      if (ammo.current <= 0) {
        reloadLeft.current = weapon.reloadTime
        game.setReloading(true)
      } else {
        fireCooldown.current = weapon.fireInterval
        ammo.current -= 1
        game.setAmmo(ammo.current)
        game.registerShot()
        const moving = Math.hypot(nx, nz) > 1
        const spread =
          (aiming ? weapon.adsSpread : weapon.hipSpread) * (moving ? 1.6 : 1) * (grounded ? 1 : 2.2)
        camera.getWorldDirection(aimDir)
        if (muzzleRef.current) muzzleRef.current.getWorldPosition(muzzle)
        else muzzle.copy(pivot)
        fx.muzzle(muzzle)
        let totalDamage = 0
        let anyHead = false
        for (let i = 0; i < weapon.pellets; i++) {
          tmp
            .copy(aimDir)
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 2 * spread,
                (Math.random() - 0.5) * 2 * spread,
                (Math.random() - 0.5) * 2 * spread,
              ),
            )
            .normalize()
          const ray = new rapier.Ray(camera.position, tmp)
          const hit = world.castRayAndGetNormal(ray, weapon.range, true, undefined, undefined, undefined, rb)
          if (hit) {
            hitPoint.copy(camera.position).addScaledVector(tmp, hit.timeOfImpact)
            hitNormal.set(hit.normal.x, hit.normal.y, hit.normal.z)
            const hitBody = hit.collider.parent()
            const isBot = !!runtime.botBody && hitBody?.handle === runtime.botBody.handle
            if (isBot) {
              const head = hitPoint.y > runtime.botPos.y + 0.56
              anyHead ||= head
              totalDamage += damageAtDistance(weapon, hitPoint.distanceTo(muzzle), head)
              fx.impact(hitPoint, hitNormal, true)
            } else {
              fx.impact(hitPoint, hitNormal)
            }
          } else {
            hitPoint.copy(camera.position).addScaledVector(tmp, weapon.range)
          }
          if (i < 3) fx.tracer(muzzle, hitPoint)
        }
        if (totalDamage > 0) {
          game.applyDamage('bot', Math.round(totalDamage), anyHead)
          haptic(anyHead ? 'heavy' : 'light')
        }
        pitch.current = Math.min(0.95, pitch.current + weapon.recoil * (aiming ? 0.6 : 1))
        yaw.current += (Math.random() - 0.5) * weapon.recoil * 0.5
        shake.current = Math.min(1.5, shake.current + weapon.recoil * 12)
        anim.current.recoil = 1
      }
    }

    // model
    if (model.current) {
      model.current.position.set(p.x, p.y - FOOT_OFFSET, p.z)
      model.current.rotation.y = yaw.current + Math.PI
      model.current.visible = camDist.current > 0.6
    }
    anim.current.speed = Math.hypot(nx, nz)
    anim.current.pitch = pitch.current
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
        ccd
        linearDamping={0}
      >
        <CapsuleCollider args={[CAPSULE.halfHeight, CAPSULE.radius]} friction={0} />
      </RigidBody>
      <SoldierModel ref={model} side="player" weapon={weaponId} anim={anim} muzzleRef={muzzleRef} />
    </>
  )
}
