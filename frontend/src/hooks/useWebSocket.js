import { useEffect, useRef, useCallback } from 'react'
import Cookies from 'js-cookie'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws'
const PING_INTERVAL = 25_000   // 25 s keep-alive

export function useWebSocket({ onMessage, onOnlineUsers }) {
  const ws          = useRef(null)
  const pingTimer   = useRef(null)
  const reconnTimer = useRef(null)
  const mounted     = useRef(true)

  const connect = useCallback(() => {
    if (!mounted.current) return

    const token = Cookies.get('access_token')
    if (!token) return

    const socket = new WebSocket(`${WS_URL}?token=${token}`)
    ws.current   = socket

    socket.onopen = () => {
      console.log('🔌 WebSocket connected')
      // Keep-alive ping
      pingTimer.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'PING' }))
        }
      }, PING_INTERVAL)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'ONLINE_USERS') {
          onOnlineUsers?.(data.onlineIds)
        } else if (data.type === 'NEW_MESSAGE') {
          onMessage?.(data.message)
        }
      } catch (_) {}
    }

    socket.onclose = () => {
      clearInterval(pingTimer.current)
      if (mounted.current) {
        // Reconnect after 3 s
        reconnTimer.current = setTimeout(connect, 3000)
      }
    }

    socket.onerror = () => socket.close()
  }, [onMessage, onOnlineUsers])

  useEffect(() => {
    mounted.current = true
    connect()
    return () => {
      mounted.current = false
      clearInterval(pingTimer.current)
      clearTimeout(reconnTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const sendMessage = useCallback((receiverId, content) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'SEND_MESSAGE', receiverId, content }))
      return true
    }
    return false
  }, [])

  return { sendMessage }
}