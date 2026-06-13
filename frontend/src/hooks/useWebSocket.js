import { useEffect, useRef, useCallback } from 'react'
import Cookies from 'js-cookie'

const WS_URL       = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws'
const PING_INTERVAL = 25_000

export function useWebSocket({ onMessage, onOnlineUsers }) {
  const ws          = useRef(null)
  const pingTimer   = useRef(null)
  const reconnTimer = useRef(null)
  const mounted     = useRef(true)

  const connect = useCallback(() => {
    if (!mounted.current) return
    const token = Cookies.get('access_token')
    if (!token) return

    const socket   = new WebSocket(`${WS_URL}?token=${token}`)
    ws.current     = socket

    socket.onopen = () => {
      console.log('🔌 WebSocket connected')
      pingTimer.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'PING' }))
        }
      }, PING_INTERVAL)
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'ONLINE_USERS') onOnlineUsers?.(data.onlineIds)
        if (data.type === 'NEW_MESSAGE')  onMessage?.(data.message)
      } catch (_) {}
    }

    socket.onclose = () => {
      clearInterval(pingTimer.current)
      if (mounted.current) reconnTimer.current = setTimeout(connect, 3000)
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

  // Send a plain text message
  const sendMessage = useCallback((receiverId, content) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'SEND_MESSAGE', receiverId, content }))
      return true
    }
    return false
  }, [])

  // Send a file message (after S3 upload is complete)
  const sendFile = useCallback((receiverId, fileData, caption = '') => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'SEND_FILE',
        receiverId,
        content:  caption,
        fileUrl:  fileData.fileUrl,
        fileKey:  fileData.fileKey,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
      }))
      return true
    }
    return false
  }, [])

  return { sendMessage, sendFile }
}