import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccessToken } from '../utils/jwt.js'
import prisma from './prisma.js'

// Map of userId → WebSocket connection
const clients = new Map()

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws, req) => {
    // ── Authenticate via token in query string ──────────────────────────────
    const url    = new URL(req.url, 'http://localhost')
    const token  = url.searchParams.get('token')

    let userId
    try {
      const decoded = verifyAccessToken(token)
      userId = decoded.id
    } catch {
      ws.close(1008, 'Unauthorized')
      return
    }

    // ── Register client ─────────────────────────────────────────────────────
    clients.set(userId, ws)
    console.log(`🟢 WS connected: ${userId} (${clients.size} online)`)

    // Mark user online in DB
    await prisma.user.update({
      where: { id: userId },
      data:  { isOnline: true, lastSeenAt: new Date() },
    })

    // Broadcast updated online list to everyone
    broadcastOnlineUsers()

    // ── Handle incoming messages ────────────────────────────────────────────
    ws.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString())

        if (payload.type === 'SEND_MESSAGE') {
          const { receiverId, content } = payload

          if (!receiverId || !content?.trim()) return

          // Persist to DB
          const message = await prisma.message.create({
            data: {
              senderId:   userId,
              receiverId,
              content:    content.trim(),
            },
          })

          const outgoing = {
            type:    'NEW_MESSAGE',
            message: {
              id:         message.id,
              content:    message.content,
              senderId:   message.senderId,
              receiverId: message.receiverId,
              isRead:     message.isRead,
              createdAt:  message.createdAt,
            },
          }

          // Send to receiver if online
          const receiverWs = clients.get(receiverId)
          if (receiverWs?.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify(outgoing))
          }

          // Echo back to sender (so their UI updates immediately)
          ws.send(JSON.stringify(outgoing))
        }

        if (payload.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }))
        }

      } catch (err) {
        console.error('WS message error:', err.message)
      }
    })

    // ── Handle disconnect ───────────────────────────────────────────────────
    ws.on('close', async () => {
      clients.delete(userId)
      console.log(`🔴 WS disconnected: ${userId} (${clients.size} online)`)

      await prisma.user.update({
        where: { id: userId },
        data:  { isOnline: false, lastSeenAt: new Date() },
      })

      broadcastOnlineUsers()
    })

    ws.on('error', (err) => {
      console.error(`WS error for ${userId}:`, err.message)
    })
  })

  return wss
}

// ── Broadcast online user IDs to all connected clients ─────────────────────────
function broadcastOnlineUsers() {
  const onlineIds = Array.from(clients.keys())
  const payload   = JSON.stringify({ type: 'ONLINE_USERS', onlineIds })

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  })
}

export function getOnlineUsers() {
  return Array.from(clients.keys())
}