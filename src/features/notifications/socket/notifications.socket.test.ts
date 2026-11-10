import { describe, expect, it } from 'vitest'
import { canUseNotificationSocket, notificationSocketConnectOptions } from './notifications.socket'

describe('notificationSocketConnectOptions', () => {
  it('sends the engine through the Vite /api proxy in local dev', () => {
    expect(notificationSocketConnectOptions('/api')).toEqual({
      url: `${window.location.origin}/notifications`,
      path: '/api/socket.io',
    })
  })

  it('uses the API host when the admin talks to an absolute API URL', () => {
    expect(notificationSocketConnectOptions('http://localhost:3000')).toEqual({
      url: 'http://localhost:3000/notifications',
      path: '/socket.io',
    })
  })
})

describe('canUseNotificationSocket', () => {
  it('staff accounts connect', () => {
    expect(canUseNotificationSocket('admin')).toBe(true)
    expect(canUseNotificationSocket('manager')).toBe(true)
  })

  it('independent reviewer and temporary inspector accounts never try (the API refuses them)', () => {
    expect(canUseNotificationSocket('independent_reviewer')).toBe(false)
    expect(canUseNotificationSocket('temporary_inspector')).toBe(false)
  })

  it('no role yet means no socket', () => {
    expect(canUseNotificationSocket(undefined)).toBe(false)
    expect(canUseNotificationSocket(null)).toBe(false)
  })
})
