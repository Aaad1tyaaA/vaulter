import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshTransmissionMaterial, PerformanceMonitor, Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { BloomEffect, VignetteEffect } from 'postprocessing'
import { cn } from '@/lib/utils'

export type OrbMode = 'lock' | 'vault'
export type OrbTheme = 'dark' | 'light'
export type OrbPulse = { kind: string; id: number }

type GlassOrbProps = {
  /** lock = big hero orb, vault = smaller orb drifting behind the UI */
  mode?: OrbMode
  theme?: OrbTheme
  /** dims the core and slows everything down (e.g. before auto-lock) */
  sleepy?: boolean
  /** fire a reaction: happy | sad | wow | pop | warp */
  pulse?: OrbPulse | null
  /** stop rendering (keeps the last frame): used while the theme wave animates */
  paused?: boolean
  className?: string
}

const PALETTE = {
  dark: {
    bg: '#000000', ring1: '#a8dcff', ring2: '#c6b8ff', sparkle: '#dcecff',
    core: { idle: '#8fd3ff', happy: '#6dffbe', sad: '#ff5c82', wow: '#c7a8ff', sleepy: '#ffb866' },
  },
  light: {
    bg: '#f3f1ea', ring1: '#1d5fd1', ring2: '#6d3ee0', sparkle: '#6d6a80',
    core: { idle: '#2f7bff', happy: '#0fb07a', sad: '#e8175d', wow: '#7c3aed', sleepy: '#e08a00' },
  },
} as const
type Mood = keyof typeof PALETTE.dark.core
const calm = () => document.body.classList.contains('calm')
// The canvas listens on <body> so the orb can sit behind the UI. Only count a pointer as "on the orb"
// when nothing interactive or readable is on top of it at that spot.
const UI = 'button, a, input, textarea, select, label, dialog, kbd, .glass, .card, .toast, .pow, h1, h2, h3, p, span, code'
const directlyOnOrb = (e: { nativeEvent: Event }) => !(e.nativeEvent.target as Element | null)?.closest?.(UI)

/** Soft radial sprite so the glow has no hard edge (bloom does the rest). */
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    gr.addColorStop(0, 'rgba(255,255,255,1)')
    gr.addColorStop(0.25, 'rgba(255,255,255,.55)')
    gr.addColorStop(0.6, 'rgba(255,255,255,.12)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
}

function Rings({ sleepy, theme }: { sleepy: boolean; theme: OrbTheme }) {
  const a = useRef<THREE.Mesh>(null!), b = useRef<THREE.Mesh>(null!)
  const P = PALETTE[theme]
  useFrame((_, dt) => {
    const k = (calm() ? 0.15 : 1) * (sleepy ? 0.3 : 1) * dt
    a.current.rotation.x += k * 0.35; a.current.rotation.y += k * 0.5
    b.current.rotation.y -= k * 0.4; b.current.rotation.z += k * 0.25
  })
  return (
    <group position={[0, 0, -0.6]} scale={0.85}>
      <mesh ref={a} rotation={[1.1, 0.3, 0]}>
        <torusGeometry args={[1.75, 0.01, 24, 256]} />
        <meshBasicMaterial color={P.ring1} toneMapped={false} />
      </mesh>
      <mesh ref={b} rotation={[0.4, 1.2, 0.5]}>
        <torusGeometry args={[2.05, 0.007, 24, 256]} />
        <meshBasicMaterial color={P.ring2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Orb({ mode, sleepy, pulse, theme, hi }: { mode: OrbMode; sleepy: boolean; pulse: OrbPulse | null; theme: OrbTheme; hi: boolean }) {
  const group = useRef<THREE.Group>(null!)
  const glass = useRef<THREE.Mesh>(null!)
  const core = useRef<THREE.MeshBasicMaterial>(null!)
  const halo = useRef<THREE.SpriteMaterial>(null!)
  const { viewport, pointer } = useThree()
  const kick = useRef({ jump: 0, shake: 0, squash: 0, spin: 0, t: 0 })
  const mood = useRef<Mood>('idle')
  const hover = useRef(false)
  const glow = useGlowTexture()
  const coreColor = useMemo(() => new THREE.Color(PALETTE.dark.core.idle), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  const target = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!pulse || calm()) return
    // app events (copy, save, unlock…) only tint the core; the orb moves only when you click it
    mood.current = pulse.kind === 'happy' ? 'happy' : pulse.kind === 'sad' ? 'sad' : 'wow'
    const id = setTimeout(() => (mood.current = 'idle'), 1400)
    return () => clearTimeout(id)
  }, [pulse])

  useFrame((state, dt) => {
    const g = group.current, k = kick.current, still = calm()
    const wide = viewport.width > 9
    if (mode === 'lock') target.set(wide ? -viewport.width * 0.2 : 0, wide ? -0.1 : viewport.height * 0.3, 0)
    else target.set(viewport.width * 0.3, viewport.height * 0.2, -1.5)
    const size = mode === 'lock' ? Math.min(wide ? 2 : 0.95, viewport.height * 0.24) : Math.min(1.5, viewport.height * 0.2)

    target.x += pointer.x * 0.35
    target.y += pointer.y * 0.25
    const time = state.clock.elapsedTime
    if (!still) target.y += Math.sin(time * 0.8) * 0.12

    g.position.lerp(target, 1 - Math.pow(0.02, dt))
    k.t += dt
    k.jump *= Math.pow(0.12, dt); k.shake *= Math.pow(0.05, dt); k.squash *= Math.pow(0.08, dt); k.spin *= Math.pow(0.25, dt)
    const sq = Math.sin(k.t * 16) * k.squash * 0.22
    const s = size * (hover.current ? 1.06 : 1) * (sleepy ? 0.94 : 1)
    const next = g.scale.x + (s - g.scale.x) * (1 - Math.pow(0.01, dt))
    g.scale.set(next * (1 + sq), next * (1 - sq), next * (1 + sq))
    g.position.y += Math.abs(Math.sin(k.t * 7)) * k.jump * 0.8
    g.position.x += Math.sin(k.t * 40) * k.shake * 0.25

    glass.current.rotation.y += dt * ((still ? 0.05 : sleepy ? 0.08 : 0.25) + k.spin * 4)
    glass.current.rotation.x = THREE.MathUtils.lerp(glass.current.rotation.x, pointer.y * 0.4, 0.05)
    glass.current.rotation.z = THREE.MathUtils.lerp(glass.current.rotation.z, -pointer.x * 0.3, 0.05)

    const P = PALETTE[theme]
    coreColor.lerp(tmp.set(P.core[sleepy ? 'sleepy' : mood.current]), 1 - Math.pow(0.05, dt))
    const breathe = sleepy ? 0.5 : 1 + Math.sin(time * 2) * 0.15
    core.current.color.copy(coreColor).multiplyScalar((theme === 'dark' ? 2.2 : 1.1) * breathe) // >1 feeds the bloom
    halo.current.color.copy(coreColor)
    halo.current.opacity = (theme === 'dark' ? 0.55 : 0.35) * breathe
  })

  return (
    <group ref={group}>
      <mesh
        ref={glass}
        onPointerMove={e => (hover.current = directlyOnOrb(e))}
        onPointerOut={() => (hover.current = false)}
        onClick={e => {
          if (!directlyOnOrb(e) || calm()) return
          const k = kick.current
          k.squash = 1; k.spin = 1; k.t = 0; mood.current = 'wow'
          setTimeout(() => (mood.current = 'idle'), 900)
        }}
      >
        <sphereGeometry args={[1, 256, 256]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.3}
          samples={hi ? 16 : 8}
          resolution={hi ? 2048 : 1024}
          backsideResolution={hi ? 1024 : 512}
          thickness={0.6}
          roughness={0}
          ior={1.2}
          chromaticAberration={0.18}
          anisotropicBlur={0.02}
          distortion={0.2}
          distortionScale={0.35}
          temporalDistortion={0.12}
          iridescence={0.7}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[120, 900]}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={theme === 'dark' ? 1.1 : 1.5}
          attenuationDistance={12}
          attenuationColor="#ffffff"
          color="#ffffff"
        />
      </mesh>
      <Rings sleepy={sleepy} theme={theme} />
      {/* glowing heart, seen through the glass: a small hot core + soft halo */}
      <mesh scale={0.1}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial ref={core} toneMapped={false} />
      </mesh>
      <sprite scale={1.1}>
        <spriteMaterial ref={halo} map={glow} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  )
}

/**
 * Theme changes only touch uniforms here. Passing theme-dependent props to <Bloom>/<Vignette> would
 * rebuild the whole post-processing pipeline (a shader recompile = a visible hitch on every toggle).
 */
function Effects({ theme, hi }: { theme: OrbTheme; hi: boolean }) {
  const bloom = useRef<BloomEffect>(null!)
  const vignette = useRef<VignetteEffect>(null!)
  // The composer mounts its effects a tick after this component, so the refs start out null.
  // Apply the theme every frame (just a few uniform writes) and skip until the effects exist.
  useFrame(() => {
    const b = bloom.current, v = vignette.current
    if (b) {
      b.intensity = theme === 'dark' ? 1.1 : 0.4
      b.luminanceMaterial.threshold = theme === 'dark' ? 0.85 : 1.1
    }
    if (v) v.darkness = theme === 'dark' ? 0.55 : 0.15
  })
  return (
    <EffectComposer multisampling={hi ? 8 : 4}>
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.85} intensity={1.1} radius={0.75} />
      <Vignette ref={vignette} eskil={false} offset={0.25} darkness={0.55} />
    </EffectComposer>
  )
}

/** Premium interactive liquid-glass orb. Renders its own full-bleed WebGL canvas. */
export function GlassOrb({ mode = 'lock', theme = 'dark', sleepy = false, pulse = null, paused = false, className }: GlassOrbProps) {
  const P = PALETTE[theme]
  // start at full quality; step down only if this GPU can't hold a smooth frame rate
  const [hi, setHi] = useState(true)
  const [dpr, setDpr] = useState(2)
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)} style={{ background: P.bg }}>
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        dpr={dpr}
        camera={{ position: [0, 0, 7], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
        eventSource={document.body}
        eventPrefix="client"
      >
        {/* ignore dips caused by our own theme transition; only a genuinely slow GPU steps quality down */}
        <PerformanceMonitor
          onDecline={() => { if (!pausedRef.current) { setDpr(d => Math.max(1, d - 0.5)); setHi(false) } }}
          onIncline={() => { if (!pausedRef.current) setDpr(d => Math.min(2, d + 0.5)) }}
        />
        <color attach="background" args={[P.bg]} />
        <Sparkles count={140} scale={[14, 9, 6]} size={2} speed={0.25} opacity={theme === 'dark' ? 0.7 : 0.45} color={P.sparkle} />
        <Orb mode={mode} sleepy={sleepy} pulse={pulse} theme={theme} hi={hi} />
        {/* studio reflections from light panels: crisp softbox highlights, no HDR download, works offline */}
        {/* 512 is plenty for reflections; 1024+ cube maps exhaust VRAM on small GPUs and lose the context */}
        <Environment resolution={512}>
          <group rotation={[-Math.PI / 3, 0, 1]}>
            <Lightformer form="rect" intensity={5} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[6, 2, 1]} />
            <Lightformer form="rect" intensity={2.5} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[4, 1, 1]} color="#a8dcff" />
            <Lightformer form="rect" intensity={2.5} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[4, 1, 1]} color="#c6b8ff" />
            <Lightformer form="rect" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1, 1]} />
            <Lightformer form="ring" intensity={4} color="#ffd9f0" rotation-y={-Math.PI / 2} position={[5, -2, 2]} scale={2.5} />
          </group>
        </Environment>
        <Effects theme={theme} hi={hi} />
      </Canvas>
    </div>
  )
}

export default GlassOrb
