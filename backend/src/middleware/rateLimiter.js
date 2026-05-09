import rateLimit from 'express-rate-limit'
import { cacheGet, cacheSet } from '../config/redis.js'

// ─── Generic limiter ───────────────────────────────────────────────────────────
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
})

// ─── Auth limiter (tighter) ────────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 10,                   // 10 attempts
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + ':' + (req.body?.email || ''),
  message: { message: 'Too many attempts. Please wait 15 minutes.' },
})

// ─── Custom Redis-backed limiter factory ──────────────────────────────────────
export function redisRateLimit({ key, max, windowSeconds }) {
  return async (req, res, next) => {
    const id     = `rl:${key}:${req.ip}`
    const count  = (await cacheGet(id)) || 0

    if (count >= max) {
      return res.status(429).json({ message: 'Rate limit exceeded. Try again later.' })
    }

    await cacheSet(id, count + 1, windowSeconds)
    next()
  }
}
