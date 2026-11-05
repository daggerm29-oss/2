'use client'

import { useEffect } from 'react'
import { input } from './runtime'
import { useGame } from './store'

/** Normalizes physical codes, arrow keys and layout-dependent keys to the WASD codes the player reads. */
const KEY_ALIASES: Record<string, string> = {
  KeyW: 'KeyW',
  ArrowUp: 'KeyW',
  w: 'KeyW',
  KeyS: 'KeyS',
  ArrowDown: 'KeyS',
  s: 'KeyS',
  KeyA: 'KeyA',
  ArrowLeft: 'KeyA',
  a: 'KeyA',
  KeyD: 'KeyD',
  ArrowRight: 'KeyD',
  d: 'KeyD',
  Space: 'Space',
  ' ': 'Space',
  ShiftLeft: 'ShiftLeft',
  ShiftRight: 'ShiftLeft',
  Shift: 'ShiftLeft',
  KeyR: 'KeyR',
  r: 'KeyR',
}

function normalize(e: KeyboardEvent) {
  return KEY_ALIASES[e.code] ?? KEY_ALIASES[e.key?.toLowerCase()] ?? KEY_ALIASES[e.key] ?? null
}

export function useDesktopInput(container: HTMLElement | null) {
  useEffect(() => {
    if (!container) return
    const store = useGame.getState
    const isLocked = () => document.pointerLockElement === container

    const onKeyDown = (e: KeyboardEvent) => {
      const k = normalize(e)
      if (!k) return
      const phase = store().phase
      if (phase === 'playing' || phase === 'countdown') e.preventDefault()
      input.keys.add(k)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const k = normalize(e)
      if (k) input.keys.delete(k)
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked()) return
      input.lookX += e.movementX
      input.lookY += e.movementY
    }
    const onMouseDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const phase = store().phase
      if (phase !== 'playing' && phase !== 'countdown') return
      if ((e.target as HTMLElement).closest('button, input, a')) return
      if (!isLocked()) {
        container.requestPointerLock?.()
        return
      }
      if (e.button === 0) input.fire = true
      if (e.button === 2) store().setAiming(true)
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) input.fire = false
      if (e.button === 2) store().setAiming(false)
    }
    const onLockChange = () => {
      const locked = isLocked()
      store().setPointerLocked(locked)
      if (!locked) input.fire = false
    }
    const onBlur = () => {
      input.keys.clear()
      input.fire = false
    }
    const onContext = (e: Event) => e.preventDefault()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('mousemove', onMouseMove)
    container.addEventListener('pointerdown', onMouseDown as EventListener)
    window.addEventListener('pointerup', onMouseUp as EventListener)
    document.addEventListener('pointerlockchange', onLockChange)
    container.addEventListener('contextmenu', onContext)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('pointerdown', onMouseDown as EventListener)
      window.removeEventListener('pointerup', onMouseUp as EventListener)
      document.removeEventListener('pointerlockchange', onLockChange)
      container.removeEventListener('contextmenu', onContext)
      input.keys.clear()
      input.fire = false
    }
  }, [container])
}
