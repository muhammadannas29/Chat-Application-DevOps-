import prisma from '../config/prisma.js'

// GET /api/messages/:userId — conversation between current user and another user
export async function getConversation(req, res, next) {
  try {
    const { userId } = req.params
    const myId       = req.user.id

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId,    receiverId: userId },
          { senderId: userId,  receiverId: myId   },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id:        true,
        content:   true,
        senderId:  true,
        receiverId:true,
        isRead:    true,
        readAt:    true,
        createdAt: true,
      },
    })

    // Mark unread messages from the other user as read
    await prisma.message.updateMany({
      where: {
        senderId:   userId,
        receiverId: myId,
        isRead:     false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    res.json({ messages })
  } catch (err) {
    next(err)
  }
}

// GET /api/messages/unread-counts — unread count per sender for current user
export async function getUnreadCounts(req, res, next) {
  try {
    const counts = await prisma.message.groupBy({
      by:     ['senderId'],
      where:  { receiverId: req.user.id, isRead: false },
      _count: { id: true },
    })

    // Shape: { senderId: count }
    const result = {}
    counts.forEach((c) => { result[c.senderId] = c._count.id })

    res.json({ unreadCounts: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/messages — save a message (used as fallback if WS fails)
export async function saveMessage(req, res, next) {
  try {
    const { receiverId, content } = req.body
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required' })
    }

    const message = await prisma.message.create({
      data: {
        senderId:   req.user.id,
        receiverId,
        content:    content.trim(),
      },
    })

    res.status(201).json({ message })
  } catch (err) {
    next(err)
  }
}