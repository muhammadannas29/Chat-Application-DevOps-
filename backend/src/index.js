import 'dotenv/config'
import http        from 'http'
import express     from 'express'
import cors        from 'cors'
import helmet      from 'helmet'
import morgan      from 'morgan'
import cookieParser from 'cookie-parser'

import { connectDB, disconnectDB } from './config/database.js'
import { createRedisClient }       from './config/redis.js'
import { setupWebSocket }          from './config/websocket.js'
import { apiLimiter }              from './middleware/rateLimiter.js'
import { errorHandler }            from './middleware/errorHandler.js'
import authRoutes                  from './routes/auth.js'
import usersRoutes                 from './routes/users.js'
import messagesRoutes              from './routes/messages.js'
import uploadRoutes                from './routes/upload.js'

const app    = express()
const server = http.createServer(app)
const PORT   = process.env.PORT || 5000

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

app.use(cors({
  origin:         process.env.CLIENT_URL || 'http://localhost:5173',
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

app.use('/api', apiLimiter)

app.use('/api/auth',     authRoutes)
app.use('/api/users',    usersRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/upload',   uploadRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
})

app.use(errorHandler)

async function start() {
  await connectDB()
  createRedisClient()
  setupWebSocket(server)

  server.listen(PORT, () => {
    console.log(`\n🚀 HTTP → http://localhost:${PORT}`)
    console.log(`🔌 WS   → ws://localhost:${PORT}/ws`)
    console.log(`🌍 Env  → ${process.env.NODE_ENV || 'development'}\n`)
  })

  const shutdown = async (sig) => {
    console.log(`\n${sig} — shutting down`)
    server.close(async () => { await disconnectDB(); process.exit(0) })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

start()