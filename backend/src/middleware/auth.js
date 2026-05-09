import { verifyAccessToken } from '../utils/jwt.js'
import { cacheGet } from '../config/redis.js'

// ─── Authenticate JWT ──────────────────────────────────────────────────────────
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const token = authHeader.slice(7)
    const decoded = verifyAccessToken(token)

    // Check token blacklist (logout)
    const isBlacklisted = await cacheGet(`bl:${token.slice(-12)}`)
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' })
    }

    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// ─── Role-based access ─────────────────────────────────────────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }
    next()
  }
}

// ─── Optional auth (attach user if token present) ─────────────────────────────
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = verifyAccessToken(authHeader.slice(7))
      req.user = decoded
    }
  } catch (_) {}
  next()
}
