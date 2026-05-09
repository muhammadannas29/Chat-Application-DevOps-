import prisma from '../config/prisma.js'
import { cacheGet, cacheSet } from '../config/redis.js'

// GET /api/users — all users except self, with online status
export async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where:  { id: { not: req.user.id } },
      select: {
        id:         true,
        name:       true,
        email:      true,
        isOnline:   true,
        lastSeenAt: true,
        createdAt:  true,
      },
      orderBy: [
        { isOnline:  'desc' },
        { name:      'asc'  },
      ],
    })
    res.json({ users })
  } catch (err) {
    next(err)
  }
}