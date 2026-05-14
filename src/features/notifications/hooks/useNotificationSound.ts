import { useCallback, useEffect, useRef } from 'react'
import type { NotificationSeverity } from '@/features/notifications/types/notification.types'

const THROTTLE_MS = 2000

let lastPlayAt = 0
let audioCtx: AudioContext | null = null

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

function beep(freq: number, durationMs: number, gain = 0.08) {
  const ctx = ensureAudioContext()
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

/** Web Audio beeps (throttled). Prefer `tryPlay` from the hook for optional `/sounds/notification.mp3`. */
export function playNotificationSound(severity: NotificationSeverity) {
  const now = Date.now()
  if (now - lastPlayAt < THROTTLE_MS) return
  lastPlayAt = now

  switch (severity) {
    case 'WARNING':
      beep(520, 120, 0.1)
      break
    case 'ERROR':
    case 'CRITICAL':
      beep(640, 90, 0.1)
      setTimeout(() => beep(640, 90, 0.1), 140)
      break
    case 'SUCCESS':
    case 'INFO':
    default:
      beep(440, 100, 0.06)
  }
}

async function tryPlayMp3(): Promise<boolean> {
  try {
    const a = new Audio('/sounds/notification.mp3')
    a.volume = 0.35
    await a.play()
    return true
  } catch {
    return false
  }
}

export function useNotificationSound() {
  const unlockedRef = useRef(false)

  useEffect(() => {
    const unlock = () => {
      const ctx = ensureAudioContext()
      if (ctx) {
        const p = ctx.resume()
        if (p && typeof (p as Promise<void>).catch === 'function') {
          void (p as Promise<void>).catch(() => {})
        }
      }
      unlockedRef.current = true
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const tryPlay = useCallback(
    async (severity: NotificationSeverity, opts?: { playSound?: boolean }) => {
      if (!unlockedRef.current) return
      if (opts?.playSound === false) return
      const now = Date.now()
      if (now - lastPlayAt < THROTTLE_MS) return
      if (await tryPlayMp3()) {
        lastPlayAt = now
        return
      }
      playNotificationSound(severity)
    },
    [],
  )

  return { tryPlay, hasUserInteracted: () => unlockedRef.current }
}
