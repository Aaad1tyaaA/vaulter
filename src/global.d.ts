/// <reference types="vite/client" />
type OrbEvent = { type: 'react' | 'mode' | 'sleepy' | 'theme' | 'pause' | 'quality'; kind?: string }
type OrbState = { mode: string; sleepy: boolean; theme: string; paused: boolean; quality: string }
interface Window {
  Orb: {
    state: OrbState
    subscribe(f: (e: OrbEvent, s: OrbState) => void): () => void
  }
}
