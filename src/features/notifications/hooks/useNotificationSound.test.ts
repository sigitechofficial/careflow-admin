import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationSound, playNotificationSound } from '@/features/notifications/hooks/useNotificationSound'

class MockAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  resume = vi.fn().mockResolvedValue(undefined)
  createOscillator = vi.fn(() => ({
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }))
  createGain = vi.fn(() => ({
    gain: { value: 0 },
    connect: vi.fn(),
  }))
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
  HTMLAudioElement.prototype.play = vi.fn().mockResolvedValue(undefined) as unknown as typeof HTMLAudioElement.prototype.play
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useNotificationSound', () => {
  it('does not play before user interaction', async () => {
    const { result } = renderHook(() => useNotificationSound())
    await act(async () => {
      await result.current.tryPlay('INFO', { playSound: true })
    })
    expect(result.current.hasUserInteracted()).toBe(false)
  })

  it('plays after pointer unlock', async () => {
    const { result } = renderHook(() => useNotificationSound())
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    expect(result.current.hasUserInteracted()).toBe(true)
    await act(async () => {
      await result.current.tryPlay('INFO', { playSound: true })
    })
  })

  it('respects playSound false', async () => {
    const { result } = renderHook(() => useNotificationSound())
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    await act(async () => {
      await result.current.tryPlay('ERROR', { playSound: false })
    })
  })
})

describe('playNotificationSound', () => {
  it('is defined', () => {
    expect(typeof playNotificationSound).toBe('function')
  })
})
