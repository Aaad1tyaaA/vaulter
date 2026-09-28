import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import type { OrbMode, OrbPulse, OrbTheme } from '@/components/ui/glass-orb'
import { VideoOrb } from '@/components/ui/video-orb'

// The live WebGL orb (three.js) only downloads if the user picks "Live 3D" in Settings.
const GlassOrb = lazy(() => import('@/components/ui/glass-orb'))
type Quality = 'video' | 'live' | 'off'

// Wires the orb to the vault logic (public/app.js) through window.Orb.
function VaultOrb() {
  const s0 = window.Orb.state
  const [mode, setMode] = useState<OrbMode>(s0.mode as OrbMode)
  const [sleepy, setSleepy] = useState(s0.sleepy)
  const [theme, setTheme] = useState<OrbTheme>(s0.theme as OrbTheme)
  const [paused, setPaused] = useState(false)
  const [quality, setQuality] = useState<Quality>(s0.quality as Quality)
  const [pulse, setPulse] = useState<OrbPulse | null>(null)
  useEffect(() => window.Orb.subscribe((e, s) => {
    if (e.type === 'mode') setMode(s.mode as OrbMode)
    if (e.type === 'sleepy') setSleepy(s.sleepy)
    if (e.type === 'theme') setTheme(s.theme as OrbTheme)
    if (e.type === 'pause') setPaused(s.paused)
    if (e.type === 'quality') setQuality(s.quality as Quality)
    if (e.type === 'react' && e.kind) setPulse({ kind: e.kind, id: performance.now() })
  }), [])
  const props = { mode, theme, sleepy, pulse }
  if (quality === 'off') return <div className="absolute inset-0" style={{ background: theme === 'dark' ? '#000' : '#f3f1ea' }} />
  if (quality === 'live') return <Suspense fallback={<VideoOrb {...props} />}><GlassOrb {...props} paused={paused} /></Suspense>
  return <VideoOrb {...props} />
}

createRoot(document.getElementById('orb-root')!).render(<StrictMode><VaultOrb /></StrictMode>)
