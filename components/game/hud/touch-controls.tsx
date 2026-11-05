'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowUp, Crosshair, RotateCw } from 'lucide-react'
import { input } from '../runtime'
import { useGame } from '../store'
import { cn } from '@/lib/utils'

const LOOK_GAIN = 2.4
const STICK_RADIUS = 52

function useDragLook() {
  const last = useRef<{ x: number; y: number; id: number } | null>(null)
  return {
    start(e: ReactPointerEvent) {
      last.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    },
    move(e: ReactPointerEvent) {
      const l = last.current
      if (!l || l.id !== e.pointerId) return
      input.lookX += (e.clientX - l.x) * LOOK_GAIN
      input.lookY += (e.clientY - l.y) * LOOK_GAIN
      l.x = e.clientX
      l.y = e.clientY
    },
    end(e: ReactPointerEvent) {
      if (last.current?.id === e.pointerId) last.current = null
    },
  }
}

export function TouchControls() {
  const aiming = useGame((s) => s.aiming)
  const setAiming = useGame((s) => s.setAiming)
  const [stick, setStick] = useState<{ ox: number; oy: number; rx: number; ry: number; dx: number; dy: number } | null>(null)
  const stickId = useRef<number | null>(null)
  const look = useDragLook()
  const fireLook = useDragLook()

  const capture = (e: ReactPointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* look surface (right side) */}
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-[60%] touch-none"
        onPointerDown={(e) => {
          capture(e)
          look.start(e)
        }}
        onPointerMove={look.move}
        onPointerUp={look.end}
        onPointerCancel={look.end}
      />

      {/* movement joystick (left side) */}
      <div
        className="pointer-events-auto absolute bottom-0 left-0 h-[70%] w-[40%] touch-none"
        onPointerDown={(e) => {
          capture(e)
          stickId.current = e.pointerId
          const rect = e.currentTarget.getBoundingClientRect()
          setStick({
            ox: e.clientX,
            oy: e.clientY,
            rx: e.clientX - rect.left,
            ry: e.clientY - rect.top,
            dx: 0,
            dy: 0,
          })
        }}
        onPointerMove={(e) => {
          if (stickId.current !== e.pointerId || !stick) return
          let dx = e.clientX - stick.ox
          let dy = e.clientY - stick.oy
          const len = Math.hypot(dx, dy)
          if (len > STICK_RADIUS) {
            dx = (dx / len) * STICK_RADIUS
            dy = (dy / len) * STICK_RADIUS
          }
          input.moveX = dx / STICK_RADIUS
          input.moveY = -dy / STICK_RADIUS
          input.sprint = len > STICK_RADIUS * 1.6 && dy < 0
          setStick({ ...stick, dx, dy })
        }}
        onPointerUp={(e) => {
          if (stickId.current !== e.pointerId) return
          stickId.current = null
          input.moveX = 0
          input.moveY = 0
          input.sprint = false
          setStick(null)
        }}
        onPointerCancel={() => {
          stickId.current = null
          input.moveX = 0
          input.moveY = 0
          input.sprint = false
          setStick(null)
        }}
      >
        <div
          className="absolute size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/5 backdrop-blur-[2px]"
          style={stick ? { left: stick.rx, top: stick.ry } : { left: '38%', top: '68%' }}
        >
          <div
            className="absolute left-1/2 top-1/2 size-12 rounded-full bg-white/40 shadow-lg"
            style={{
              transform: `translate(calc(-50% + ${stick?.dx ?? 0}px), calc(-50% + ${stick?.dy ?? 0}px))`,
            }}
          />
        </div>
      </div>

      {/* action buttons */}
      <div className="absolute bottom-6 right-5 flex items-end gap-3">
        <div className="flex flex-col gap-3">
          <ActionButton
            label="Reload"
            onDown={() => {
              input.reloadQueued = true
            }}
          >
            <RotateCw className="size-5" aria-hidden />
          </ActionButton>
          <ActionButton
            label={aiming ? 'Stop aiming' : 'Aim'}
            active={aiming}
            onDown={() => setAiming(!aiming)}
          >
            <Crosshair className="size-5" aria-hidden />
          </ActionButton>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ActionButton
            label="Jump"
            onDown={() => {
              input.jumpQueued = true
            }}
          >
            <ArrowUp className="size-5" aria-hidden />
          </ActionButton>
          <button
            type="button"
            aria-label="Fire"
            className="pointer-events-auto flex size-20 touch-none items-center justify-center rounded-full border-2 border-primary/80 bg-primary/30 text-xs font-bold uppercase tracking-widest text-white shadow-xl backdrop-blur-sm active:bg-primary/60"
            onPointerDown={(e) => {
              capture(e)
              input.fire = true
              fireLook.start(e)
            }}
            onPointerMove={fireLook.move}
            onPointerUp={(e) => {
              input.fire = false
              fireLook.end(e)
            }}
            onPointerCancel={(e) => {
              input.fire = false
              fireLook.end(e)
            }}
          >
            Fire
          </button>
        </div>
      </div>

      {/* left fire button like the original mode */}
      <button
        type="button"
        aria-label="Fire (left)"
        className="pointer-events-auto absolute left-5 top-[38%] flex size-14 touch-none items-center justify-center rounded-full border border-primary/70 bg-primary/25 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm active:bg-primary/60"
        onPointerDown={(e) => {
          capture(e)
          input.fire = true
        }}
        onPointerUp={() => {
          input.fire = false
        }}
        onPointerCancel={() => {
          input.fire = false
        }}
      >
        Fire
      </button>
    </div>
  )
}

function ActionButton({
  label,
  onDown,
  active,
  children,
}: {
  label: string
  onDown: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'pointer-events-auto flex size-12 touch-none items-center justify-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-sm active:bg-white/30',
        active && 'border-primary bg-primary/40',
      )}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDown()
      }}
    >
      {children}
    </button>
  )
}
