'use client'

import { Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, Environment, Lightformer, Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { IndustrialYard } from './map/industrial-yard'
import { Player } from './player'
import { Bot } from './bot'
import { Effects } from './effects'
import { SPAWNS } from './runtime'
import { useGame } from './store'

function Director() {
  useFrame((_, dt) => {
    useGame.getState().tick(Math.min(dt, 0.1))
  })
  return null
}

function Combatants() {
  const roundKey = useGame((s) => s.roundKey)
  const swap = roundKey % 2 === 0
  const playerSpawn = swap ? SPAWNS.b : SPAWNS.a
  const botSpawn = swap ? SPAWNS.a : SPAWNS.b
  return (
    <>
      <Player key={`p${roundKey}`} spawn={playerSpawn} yaw={swap ? Math.PI : 0} />
      <Bot key={`b${roundKey}`} spawn={botSpawn} yaw={swap ? 0 : Math.PI} />
    </>
  )
}

export function GameScene() {
  const lowEnd = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  )
  const shadowSize = lowEnd ? 1024 : 2048

  return (
    <Canvas
      shadows
      dpr={lowEnd ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      camera={{ fov: 72, near: 0.05, far: 260, position: [0, 2, 24] }}
      className="touch-none"
    >
      <color attach="background" args={['#b9cad8']} />
      <fog attach="fog" args={['#c3cfd8', 45, 150]} />
      <Sky distance={4500} sunPosition={[60, 35, -40]} turbidity={7} rayleigh={1.4} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <hemisphereLight args={['#e4edf5', '#6b6052', 1.1]} />
      <directionalLight
        castShadow
        position={[30, 38, -22]}
        intensity={3.2}
        color="#fff1dc"
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <Environment resolution={64} frames={1} environmentIntensity={0.9}>
        <Lightformer form="rect" intensity={2.5} color="#fff1dc" position={[10, 12, -8]} scale={[20, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#cfe0ef" position={[-12, 8, 10]} scale={[20, 6, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#8a7a66" position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="ring" intensity={4} color="#ffffff" position={[30, 30, -20]} scale={6} />
      </Environment>
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]}>
          <IndustrialYard />
          <Combatants />
        </Physics>
      </Suspense>
      <Effects />
      <Director />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  )
}
