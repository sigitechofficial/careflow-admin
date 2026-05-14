import { io, type Socket } from 'socket.io-client'
import { getApiBaseUrl } from '@/lib/api-base'

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

export function connectNotificationSocket(accessToken: string) {
  disconnectNotificationSocket()
  const base = getApiBaseUrl()?.replace(/\/$/, '')
  if (!base || !accessToken) return null

  const url = `${base}/notifications`
  socket = io(url, {
    path: '/socket.io',
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  })
  return socket
}
