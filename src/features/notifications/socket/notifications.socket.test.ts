import { describe, expect, it } from 'vitest'
import { notificationSocketConnectOptions } from './notifications.socket'

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
