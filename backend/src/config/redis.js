import Redis from 'ioredis'

let redisClient = null
let redisAvailable = false

export function createRedisClient() {
  if (redisClient) return redisClient

  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('⚠️  Redis unavailable — falling back to in-memory store')
        redisAvailable = false
        return null // stop retrying
      }
      return Math.min(times * 200, 2000)
    },
    maxRetriesPerRequest: 1,
  })

  redisClient.on('connect', () => {
    redisAvailable = true
    console.log('✅ Redis connected')
  })

  redisClient.on('error', () => {
    redisAvailable = false
  })

  return redisClient
}

// ─── In-memory fallback ────────────────────────────────────────────────────────
const memoryStore = new Map()

export async function cacheSet(key, value, ttlSeconds) {
  if (redisAvailable && redisClient) {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value))
      return
    } catch (_) {}
  }
  // Fallback
  memoryStore.set(key, { value, expires: Date.now() + ttlSeconds * 1000 })
}

export async function cacheGet(key) {
  if (redisAvailable && redisClient) {
    try {
      const data = await redisClient.get(key)
      return data ? JSON.parse(data) : null
    } catch (_) {}
  }
  // Fallback
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) { memoryStore.delete(key); return null }
  return entry.value
}

export async function cacheDel(key) {
  if (redisAvailable && redisClient) {
    try { await redisClient.del(key); return } catch (_) {}
  }
  memoryStore.delete(key)
}
