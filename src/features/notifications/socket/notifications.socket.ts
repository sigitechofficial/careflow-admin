import { io, type Socket } from 'socket.io-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'

let socket: Socket | null = null

export function getNotificationSocket(): Socket | null {
  return socket
}

export function disconnectNotificationSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

/** Socket.IO URL + path so Vite `/api` proxy can forward the websocket to Nest. */
export function notificationSocketConnectOptions(baseUrl: string): {
  url: string
  path: string
} {
  const base = baseUrl.replace(/\/$/, '')
  if (base.startsWith('/')) {
    return {
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/notifications`,
      path: `${base}/socket.io`,
    }
  }
  return { url: `${base}/notifications`, path: '/socket.io' }
}

export function connectNotificationSocket(accessToken: string) {
  disconnectNotificationSocket()
  const base = getApiBaseUrl()?.replace(/\/$/, '')
  if (!base || !accessToken) return null

  const { url, path } = notificationSocketConnectOptions(base)
  socket = io(url, {
    path,
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  })
  return socket
}
