import { WebSocketServer, WebSocket } from 'ws'
import { verifyAccessToken }          from '../utils/jwt.js'
import prisma                         from './prisma.js'

const clients = new Map()

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws, req) => {
    // ── Auth ────────────────────────────────────────────────────────────────
    const url   = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token')

    let userId
    try {
      const decoded = verifyAccessToken(token)
      userId = decoded.id
    } catch {
      ws.close(1008, 'Unauthorized')
      return
    }

    clients.set(userId, ws)
    console.log(`🟢 WS connected: ${userId} (${clients.size} online)`)

    await prisma.user.update({
      where: { id: userId },
      data:  { isOnline: true, lastSeenAt: new Date() },
    })

    broadcastOnlineUsers()

    // ── Messages ────────────────────────────────────────────────────────────
    ws.on('message', async (raw) => {
      try {
        const payload = JSON.parse(raw.toString())

        // ── Text message ──────────────────────────────────────────────────
        if (payload.type === 'SEND_MESSAGE') {
          const { receiverId, content } = payload
          if (!receiverId || !content?.trim()) return

          const message = await prisma.message.create({
            data: {
              senderId:   userId,
              receiverId,
              content:    content.trim(),
            },
          })

          dispatch(userId, receiverId, message)
        }

        // ── File message ──────────────────────────────────────────────────
        // Sent after the client has already uploaded the file to S3
        if (payload.type === 'SEND_FILE') {
          const { receiverId, fileUrl, fileKey, fileName, fileType, fileSize, content } = payload

          if (!receiverId || !fileUrl || !fileKey) return

          const message = await prisma.message.create({
            data: {
              senderId:   userId,
              receiverId,
              content:    content?.trim() || null,   // optional caption
              fileUrl,
              fileKey,
              fileName,
              fileType,
              fileSize,
            },
          })

          dispatch(userId, receiverId, message)
        }

        if (payload.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }))
        }

      } catch (err) {
        console.error('WS message error:', err.message)
      }
    })

    // ── Disconnect ──────────────────────────────────────────────────────────
    ws.on('close', async () => {
      clients.delete(userId)
      console.log(`🔴 WS disconnected: ${userId} (${clients.size} online)`)
      await prisma.user.update({
        where: { id: userId },
        data:  { isOnline: false, lastSeenAt: new Date() },
      })
      broadcastOnlineUsers()
    })

    ws.on('error', (err) => console.error(`WS error ${userId}:`, err.message))
  })

  return wss
}

// ── Send message to receiver + echo to sender ─────────────────────────────────
function dispatch(senderId, receiverId, message) {
  const outgoing = {
    type:    'NEW_MESSAGE',
    message: {
      id:         message.id,
      content:    message.content,
      senderId:   message.senderId,
      receiverId: message.receiverId,
      fileUrl:    message.fileUrl    || null,
      fileKey:    message.fileKey    || null,
      fileName:   message.fileName   || null,
      fileType:   message.fileType   || null,
      fileSize:   message.fileSize   || null,
      isRead:     message.isRead,
      createdAt:  message.createdAt,
    },
  }

  const senderWs   = clients.get(senderId)
  const receiverWs = clients.get(receiverId)

  if (senderWs?.readyState   === WebSocket.OPEN) senderWs.send(JSON.stringify(outgoing))
  if (receiverWs?.readyState === WebSocket.OPEN) receiverWs.send(JSON.stringify(outgoing))
}

function broadcastOnlineUsers() {
  const onlineIds = Array.from(clients.keys())
  const payload   = JSON.stringify({ type: 'ONLINE_USERS', onlineIds })
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload)
  })
}

export function getOnlineUsers() {
  return Array.from(clients.keys())
}