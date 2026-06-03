import { useCallback, useEffect, useRef } from 'react'
import type { NotificationSeverity } from '@/features/notifications/types/notification.types'

const THROTTLE_MS = 2000

let lastPlayAt = 0
let audioCtx: AudioContext | null = null
/** Survives hook remounts; set on any user gesture or prior activation (e.g. after login). */
let audioUnlocked = false

function hasBrowserUserActivation(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation
  return ua?.hasBeenActive === true
}

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

/** Call from UI (e.g. notification bell) so sound works after login without an extra click. */
export function markNotificationAudioUnlocked() {
  audioUnlocked = true
  const ctx = ensureAudioContext()
  if (ctx?.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }
}

async function resumeAudioContext(): Promise<AudioContext | null> {
  const ctx = ensureAudioContext()
  if (!ctx) return null
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return null
    }
  }
  return ctx.state === 'running' ? ctx : null
}

async function beep(freq: number, durationMs: number, gain = 0.14) {
  const ctx = await resumeAudioContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(ctx.destination)
  const t = ctx.currentTime
  osc.start(t)
  osc.stop(t + durationMs / 1000)
}

/** Web Audio beeps (throttled). */
export async function playNotificationSound(severity: NotificationSeverity) {
  const now = Date.now()
  if (now - lastPlayAt < THROTTLE_MS) return
  lastPlayAt = now

  switch (severity) {
    case 'WARNING':
      await beep(520, 140, 0.16)
      break
    case 'ERROR':
    case 'CRITICAL':
      await beep(640, 100, 0.18)
      setTimeout(() => void beep(640, 100, 0.18), 150)
      break
    case 'SUCCESS':
    case 'INFO':
    default:
      await beep(440, 120, 0.12)
  }
}

export function useNotificationSound() {
  const unlockedRef = useRef(audioUnlocked)

  useEffect(() => {
    const unlock = () => {
      markNotificationAudioUnlocked()
      unlockedRef.current = true
    }
    const opts: AddEventListenerOptions = { capture: true, passive: true }
    window.addEventListener('pointerdown', unlock, opts)
    window.addEventListener('keydown', unlock, opts)
    window.addEventListener('click', unlock, opts)
    if (hasBrowserUserActivation()) {
      unlock()
    }
    return () => {
      window.removeEventListener('pointerdown', unlock, opts)
      window.removeEventListener('keydown', unlock, opts)
      window.removeEventListener('click', unlock, opts)
    }
  }, [])

  const tryPlay = useCallback(
    async (severity: NotificationSeverity, opts?: { playSound?: boolean }) => {
      if (opts?.playSound === false) return
      if (!audioUnlocked && !hasBrowserUserActivation()) return

      markNotificationAudioUnlocked()
      unlockedRef.current = true

      const now = Date.now()
      if (now - lastPlayAt < THROTTLE_MS) return

      await playNotificationSound(severity)
    },
    [],
  )

  return { tryPlay, hasUserInteracted: () => audioUnlocked || unlockedRef.current }
}
