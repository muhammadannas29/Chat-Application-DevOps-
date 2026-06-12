import prisma from '../config/prisma.js'

// ── Shared select shape — always return file fields too ───────────────────────
const MESSAGE_SELECT = {
  id:         true,
  content:    true,
  senderId:   true,
  receiverId: true,
  fileUrl:    true,
  fileKey:    true,
  fileName:   true,
  fileType:   true,
  fileSize:   true,
  isRead:     true,
  readAt:     true,
  createdAt:  true,
}

// GET /api/messages/:userId
export async function getConversation(req, res, next) {
  try {
    const { userId } = req.params
    const myId       = req.user.id

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId,   receiverId: userId },
          { senderId: userId, receiverId: myId   },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select:  MESSAGE_SELECT,
    })

    // Mark unread messages from the other user as read
    await prisma.message.updateMany({
      where:  { senderId: userId, receiverId: myId, isRead: false },
      data:   { isRead: true, readAt: new Date() },
    })

    res.json({ messages })
  } catch (err) {
    next(err)
  }
}

// GET /api/messages/unread-counts
export async function getUnreadCounts(req, res, next) {
  try {
    const counts = await prisma.message.groupBy({
      by:     ['senderId'],
      where:  { receiverId: req.user.id, isRead: false },
      _count: { id: true },
    })

    const result = {}
    counts.forEach((c) => { result[c.senderId] = c._count.id })
    res.json({ unreadCounts: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/messages — REST fallback (text or file message)
export async function saveMessage(req, res, next) {
  try {
    const {
      receiverId, content,
      fileUrl, fileKey, fileName, fileType, fileSize,
    } = req.body

    // Must have either text content or a file
    if (!receiverId || (!content?.trim() && !fileUrl)) {
      return res.status(400).json({ message: 'receiverId and content or file are required' })
    }

    const message = await prisma.message.create({
      data: {
        senderId:   req.user.id,
        receiverId,
        content:    content?.trim() || null,
        fileUrl:    fileUrl   || null,
        fileKey:    fileKey   || null,
        fileName:   fileName  || null,
        fileType:   fileType  || null,
        fileSize:   fileSize  || null,
      },
      select: MESSAGE_SELECT,
    })

    res.status(201).json({ message })
  } catch (err) {
    next(err)
  }
}