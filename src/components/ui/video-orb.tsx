import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { OrbMode, OrbPulse, OrbTheme } from '@/components/ui/glass-orb'

type VideoOrbProps = {
  mode?: OrbMode
  theme?: OrbTheme
  sleepy?: boolean
  pulse?: OrbPulse | null
  className?: string
}

const CORE = {
  dark: { idle: '#8fd3ff', happy: '#6dffbe', sad: '#ff5c82', wow: '#c7a8ff', sleepy: '#ffb866' },
  light: { idle: '#2f7bff', happy: '#0fb07a', sad: '#e8175d', wow: '#7c3aed', sleepy: '#e08a00' },
} as const
type Mood = keyof typeof CORE.dark

// Anything the user can read or press sits above the orb; clicks there are not "on the orb".
const UI = 'button, a, input, textarea, select, label, dialog, kbd, .glass, .card, .toast, .pow, h1, h2, h3, p, span, code'
const calm = () => document.body.classList.contains('calm')

/** Where the orb sits for each screen. Size is the video square; the glass ball itself is half of it. */
function layout(mode: OrbMode) {
  const W = innerWidth, H = innerHeight
  if (mode === 'vault') { const s = Math.min(H * 0.55, W * 0.36); return { x: W * 0.8, y: H * 0.28, s } } // top-right corner
  // lock screen: below the tagline, so the glass frames the text instead of covering it
  if (W > 900) { const s = Math.min(H * 0.74, W * 0.46); return { x: W * 0.27, y: H * 0.64, s } }
  const s = Math.min(H * 0.5, W * 0.95); return { x: W * 0.5, y: H * 0.2, s }
}

/**
 * The orb as a pre-rendered, seamlessly looping video (rendered offline at max quality by scripts/render-orb.cjs).
 * Costs almost nothing to play (hardware video decode), so it runs the same on any laptop.
 * A direct click plays a second pre-rendered clip (the burst) that starts and ends on the loop's first frame.
 * Motion that must react live (cursor drift, mood colour) is layered on with CSS transforms.
 */
export function VideoOrb({ mode = 'lock', theme = 'dark', sleepy = false, pulse = null, className }: VideoOrbProps) {
  const pos = useRef<HTMLDivElement>(null!)
  const squash = useRef<HTMLDivElement>(null!)
  const vids = { dark: useRef<HTMLVideoElement>(null!), light: useRef<HTMLVideoElement>(null!) }
  const bursts = { dark: useRef<HTMLVideoElement>(null!), light: useRef<HTMLVideoElement>(null!) }
  const [bursting, setBursting] = useState(false)
  const themeRef = useRef(theme)
  themeRef.current = theme
  const [mood, setMood] = useState<Mood>('idle')
  const [hover, setHover] = useState(false)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const geo = useRef({ x: 0, y: 0, s: 0 })

  // Position: ease toward the mode's spot plus a little cursor drift. Transform-only, so it stays on the compositor.
  useEffect(() => {
    let raf = 0, mx = 0, my = 0
    const cur = { ...layout(modeRef.current) }
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5
      const g = geo.current, d = Math.hypot(e.clientX - g.x, e.clientY - g.y)
      setHover(d < g.s * 0.25 && !(e.target as Element)?.closest?.(UI))
    }
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (document.hidden) return
      const t = layout(modeRef.current), k = calm() ? 1 : 0.06
      cur.x += (t.x + mx * 36 - cur.x) * k
      cur.y += (t.y + my * 26 - cur.y) * k
      cur.s += (t.s - cur.s) * k
      geo.current = cur
      pos.current.style.transform = `translate3d(${cur.x - cur.s / 2}px, ${cur.y - cur.s / 2}px, 0)`
      pos.current.style.width = pos.current.style.height = `${cur.s}px`
    }
    addEventListener('pointermove', onMove, { passive: true })
    tick()
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', onMove) }
  }, [])

  // Only a direct click on the ball (nothing on top of it) makes it react.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.(UI) || calm()) return
      const g = geo.current
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > g.s * 0.25) return
      const b = bursts[themeRef.current].current
      if (b && b.readyState >= 2) {
        // the recorded reaction: crossfade into it (the impact hides the cut) and restart it on every click
        b.currentTime = 0
        b.play().catch(() => {})
        setBursting(true)
      } else {
        // clip not loaded (yet): fall back to a CSS squash
        squash.current.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.1, .88)' }, { transform: 'scale(.95, 1.06)' }, { transform: 'scale(1.02, .98)' }, { transform: 'scale(1)' }],
          { duration: 700, easing: 'cubic-bezier(.3,.7,.2,1)' })
      }
      setMood('wow')
      setTimeout(() => setMood('idle'), 1300)
    }
    addEventListener('click', onClick)
    return () => removeEventListener('click', onClick)
  }, [])

  // App events only tint the core.
  useEffect(() => {
    if (!pulse) return
    setMood(pulse.kind === 'happy' ? 'happy' : pulse.kind === 'sad' ? 'sad' : 'wow')
    const id = setTimeout(() => setMood('idle'), 1400)
    return () => clearTimeout(id)
  }, [pulse])

  // Decode only the visible clip; nothing plays while the window is hidden or in calm mode.
  useEffect(() => {
    const sync = () => {
      for (const t of ['dark', 'light'] as const) {
        const v = vids[t].current
        if (t === theme && !document.hidden && !calm()) v.play().catch(() => {})
        else { v.pause(); bursts[t].current.pause() }
      }
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    const mo = new MutationObserver(sync)
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => { document.removeEventListener('visibilitychange', sync); mo.disconnect() }
  }, [theme])

  const core = CORE[theme][sleepy ? 'sleepy' : mood]
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ background: theme === 'dark' ? '#000' : '#f3f1ea' }}>
      <div ref={pos} className="absolute left-0 top-0 will-change-transform">
        <div className={cn('h-full w-full', !sleepy && 'orb-bob')}>
          <div ref={squash} className="relative h-full w-full transition-transform duration-500 ease-out" style={{ transform: hover ? 'scale(1.04)' : undefined }}>
            {(['dark', 'light'] as const).map(t => (
              <video
                key={t}
                ref={vids[t]}
                className="absolute inset-0 h-full w-full"
                style={{
                  opacity: t === theme && !bursting ? 1 : 0,
                  transition: 'opacity 120ms linear',
                  // feather the square's edges so it melts into the page on any background
                  maskImage: 'radial-gradient(closest-side, #000 82%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(closest-side, #000 82%, transparent 100%)',
                }}
                src={`./orb/orb-${t}.webm`}
                poster={`./orb/orb-${t}.png`}
                muted loop playsInline preload="auto"
                aria-hidden="true"
              />
            ))}
            {(['dark', 'light'] as const).map(t => (
              <video
                key={`${t}-burst`}
                ref={bursts[t]}
                className="absolute inset-0 h-full w-full"
                style={{
                  opacity: t === theme && bursting ? 1 : 0,
                  transition: 'opacity 120ms linear',
                  maskImage: 'radial-gradient(closest-side, #000 82%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(closest-side, #000 82%, transparent 100%)',
                }}
                src={`./orb/orb-${t}-burst.webm`}
                muted playsInline preload="auto"
                aria-hidden="true"
                onEnded={() => {
                  // the burst finishes on the loop's first frame, so resume the loop from there
                  const v = vids[t].current
                  v.currentTime = 0
                  if (!document.hidden && !calm()) v.play().catch(() => {})
                  setBursting(false)
                }}
              />
            ))}
            {/* the glowing heart: a CSS layer so its colour can change instantly */}
            <div
              className="orb-core absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color,opacity] duration-700"
              style={{
                backgroundColor: core,
                opacity: sleepy ? 0.45 : 1,
                mixBlendMode: theme === 'dark' ? 'screen' : 'multiply',
                maskImage: 'radial-gradient(circle, #000 0 9%, rgba(0,0,0,.55) 22%, rgba(0,0,0,.15) 42%, transparent 68%)',
                WebkitMaskImage: 'radial-gradient(circle, #000 0 9%, rgba(0,0,0,.55) 22%, rgba(0,0,0,.15) 42%, transparent 68%)',
              }}
            />
            <div className="absolute left-1/2 top-1/2 h-[3.2%] w-[3.2%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: theme === 'dark' ? '#fff' : core, opacity: sleepy ? 0.5 : 0.95, boxShadow: `0 0 18px 4px ${core}` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoOrb
