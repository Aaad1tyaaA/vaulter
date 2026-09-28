// Offline renderer for the orb video (dev-only; loaded by scripts/render-orb.cjs, never shipped).
// Everything is driven by a fixed clock and completes whole turns over LOOP seconds, so the video loops seamlessly.
// ?clip=burst renders the click reaction instead: every motion starts and ends on the loop's first frame.
import { useRef } from 'react'
import * as THREE from 'three'
import { advance, createRoot, extend, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'

const q = new URLSearchParams(location.search)
const theme = q.get('theme') === 'light' ? 'light' : 'dark'
const BURST = q.get('clip') === 'burst'
const LOOP = 12, BURST_LEN = 1.8
const FPS = BURST ? 60 : 30 // the burst is fast, so it gets 60fps
const P = theme === 'dark'
  ? { bg: '#000000', ring1: '#a8dcff', ring2: '#c6b8ff', env: 1.1 }
  : { bg: '#f3f1ea', ring1: '#1d5fd1', ring2: '#6d3ee0', env: 1.5 }
let T = 0 // seconds into the loop, set per frame by renderFrame()
let SPIN = 0 // burst: how far the studio lights have swept (a spinning glass ball only reads through moving reflections)

const glow = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)')
  gr.addColorStop(0.65, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
})()

const TAU = Math.PI * 2
const easeOut = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3

function Scene() {
  const glass = useRef<THREE.Mesh>(null!), a = useRef<THREE.Mesh>(null!), b = useRef<THREE.Mesh>(null!)
  const body = useRef<THREE.Group>(null!), glowMat = useRef<THREE.SpriteMaterial>(null!)
  const wave1 = useRef<THREE.Mesh>(null!), wave2 = useRef<THREE.Mesh>(null!)
  const baseGlow = theme === 'dark' ? 0.32 : 0.22
  useFrame(() => {
    let ph = 0, spin = 0, ringA = 0, ringB = 0, jig = 0, flash = 1
    if (!BURST) ph = (T / LOOP) * TAU // idle: one full turn per loop
    else {
      // click reaction: two fast turns, whipping rings, a jelly squash and a glow flash, all settling to zero
      const e = easeOut(T / BURST_LEN)
      spin = e * 2 * TAU; ringA = e * 3 * TAU; ringB = e * 2 * TAU
      SPIN = spin
      jig = 0.2 * Math.sin(T * 17) * Math.exp(-T * 3.2)
      flash = 1 + 20 * T * Math.exp(-5 * T)
    }
    glass.current.rotation.set(0.15, ph + spin, 0)
    a.current.rotation.set(1.1 + ph + ringA, 0.3 + ph + ringA, 0)
    b.current.rotation.set(0.4, 1.2 - ph - ringB, 0.5 + ph + ringB)
    const punch = BURST && T < 0.4 ? 0.14 * Math.sin(Math.PI * T / 0.4) : 0 // quick swell on impact
    body.current.scale.set(1 + jig + punch, 1 - jig + punch, 1 + jig + punch)
    glowMat.current.opacity = baseGlow * flash
    // two shockwave rings pulse out from the rim and fade before the frame edge
    for (const [w, delay] of [[wave1.current, 0], [wave2.current, 0.16]] as const) {
      const k = (T - delay) / 0.85
      w.visible = BURST && k > 0 && k < 1
      w.scale.setScalar(1.02 + 0.9 * easeOut(k))
      ;(w.material as THREE.MeshBasicMaterial).opacity = (1 - k) ** 1.5
    }
  })
  // frame spans +/-2 orb radii so the rings and their glow always fit (camera half-height at z=7, fov 40 ~ 2.55)
  return (
    <group scale={1.27}>
      {/* soft light inside the ball: gives the glass a body to refract; the coloured core is a CSS layer on top */}
      <sprite scale={1.7}>
        <spriteMaterial ref={glowMat} map={glow} transparent depthWrite={false} opacity={theme === 'dark' ? 0.32 : 0.22}
          color={theme === 'dark' ? '#cfe6ff' : '#6d86b8'} blending={theme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending} toneMapped={false} />
      </sprite>
      {[wave1, wave2].map((w, i) => (
        <mesh key={i} ref={w} visible={false}>
          <torusGeometry args={[1, i ? 0.006 : 0.012, 24, 512]} />
          <meshBasicMaterial color={i ? P.ring2 : P.ring1} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      <group ref={body}>
      <mesh ref={glass}>
        <sphereGeometry args={[1, 256, 256]} />
        <MeshTransmissionMaterial
          backside backsideThickness={0.3} samples={24} resolution={1536} backsideResolution={1024}
          thickness={0.6} roughness={0} ior={1.2} chromaticAberration={0.18} anisotropicBlur={0.02}
          distortion={0.2} distortionScale={0.35} temporalDistortion={0}
          iridescence={0.7} iridescenceIOR={1.3} iridescenceThicknessRange={[120, 900]}
          clearcoat={1} clearcoatRoughness={0} envMapIntensity={P.env}
          attenuationDistance={12} attenuationColor="#ffffff" color="#ffffff"
        />
      </mesh>
      </group>
      <group position={[0, 0, -0.6]} scale={0.85}>
        <mesh ref={a}><torusGeometry args={[1.75, 0.01, 32, 512]} /><meshBasicMaterial color={P.ring1} toneMapped={false} /></mesh>
        <mesh ref={b}><torusGeometry args={[2.05, 0.007, 32, 512]} /><meshBasicMaterial color={P.ring2} toneMapped={false} /></mesh>
      </group>
    </group>
  )
}

function Diag() {
  const gl = useThree(s => s.gl)
  ;(window as unknown as { __diag: () => object }).__diag = () => {
    const c = gl.getContext(), px = new Uint8Array(4)
    c.readPixels(c.drawingBufferWidth >> 1, c.drawingBufferHeight >> 1, 1, 1, c.RGBA, c.UNSIGNED_BYTE, px)
    return { calls: gl.info.render.calls, lost: c.isContextLost(), buf: [c.drawingBufferWidth, c.drawingBufferHeight], center: [...px], glErr: c.getError() }
  }
  return null
}

function SweepingLights({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => { g.current.rotation.set(-Math.PI / 3, SPIN, 1) })
  return <group ref={g} rotation={[-Math.PI / 3, 0, 1]}>{children}</group>
}

function World() {
  return (
    <>
      <Diag />
      <color attach="background" args={[P.bg]} />
      <Scene />
      <Environment resolution={512} frames={BURST ? Infinity : 1}>
        {/* a dim wall behind the orb: grazing-angle reflections of it draw the glass rim, so it reads as a ball */}
        <Lightformer form="rect" intensity={theme === 'dark' ? 0.9 : 0.3} position={[0, 0, -12]} scale={[40, 40, 1]} color={theme === 'dark' ? '#5d6a86' : '#ffffff'} />
        <SweepingLights>
          <Lightformer form="rect" intensity={5} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[6, 2, 1]} />
          <Lightformer form="rect" intensity={2.5} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[4, 1, 1]} color="#a8dcff" />
          <Lightformer form="rect" intensity={2.5} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[4, 1, 1]} color="#c6b8ff" />
          <Lightformer form="rect" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1, 1]} />
          <Lightformer form="ring" intensity={4} color="#ffd9f0" rotation-y={-Math.PI / 2} position={[5, -2, 2]} scale={2.5} />
        </SweepingLights>
      </Environment>
      {theme === 'dark' && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={0.8} intensity={0.9} radius={0.7} />
        </EffectComposer>
      )}
    </>
  )
}

declare global { interface Window { renderFrame(i: number): string; renderReady: Promise<boolean>; LOOP_FRAMES: number; CLIP_FPS: number } }
// A hand-made root with a fixed size: <Canvas> sizes itself with a ResizeObserver, which never fires in a
// capture window with the loop stopped (the canvas stayed 300x150 and nothing drew). 1024 CSS px x dpr 2 = 2048px.
extend(THREE as unknown as Parameters<typeof extend>[0])
const canvas = document.createElement('canvas')
canvas.style.cssText = 'width:1024px;height:1024px;display:block'
document.getElementById('r')!.append(canvas)
const root = createRoot(canvas)
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
window.LOOP_FRAMES = Math.round((BURST ? BURST_LEN : LOOP) * FPS)
window.CLIP_FPS = FPS
window.renderFrame = (i: number) => {
  T = i / FPS
  advance(performance.now())
  return canvas.toDataURL('image/png')
}
window.renderReady = (async () => {
  await root.configure({
    size: { width: 1024, height: 1024, top: 0, left: 0 }, dpr: 2, frameloop: 'never',
    camera: { position: [0, 0, 7], fov: 40 },
    gl: { antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping },
  })
  root.render(<World />)
  await wait(800) // mount + composer setup
  for (let i = 0; i < 16; i++) { window.renderFrame(0); await wait(30) } // env map + transmission buffers settle
  return true
})()
