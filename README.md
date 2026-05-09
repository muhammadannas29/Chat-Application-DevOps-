# 🔐 Auth App — React + Vite + Express + PostgreSQL + Redis

Full-stack JWT authentication system. Local PostgreSQL → one-variable swap to AWS RDS.

---

## 📁 Complete Project Structure

```
auth-app/
│
├── docker-compose.yml               # Postgres 16 + Redis 7 for local dev
├── .gitignore
├── README.md
│
├── frontend/                        # ── React 18 + Vite 5 ──────────────────────
│   ├── index.html                   # Loads Google Fonts (Syne + DM Sans)
│   ├── vite.config.js               # Dev proxy: /api → localhost:5000
│   ├── package.json
│   └── src/
│       ├── main.jsx                 # ReactDOM root, BrowserRouter, Toaster
│       ├── App.jsx                  # Route tree: /login /signup / (protected)
│       │
│       ├── styles/
│       │   └── globals.css          # CSS custom properties, keyframes, reset
│       │
│       ├── pages/
│       │   ├── LoginPage.jsx        # Email + password form, inline validation
│       │   ├── SignupPage.jsx        # Name + email + password, strength bar,
│       │   │                        #   terms checkbox
│       │   └── HomePage.jsx         # Protected dashboard — navbar, stats,
│       │                            #   6 feature cards (expandable)
│       ├── components/
│       │   ├── AuthLayout.jsx       # Canvas orb animation + noise overlay
│       │   │                        #   + card wrapper
│       │   ├── Input.jsx            # Accessible input: label, error, eye-toggle
│       │   └── ProtectedRoute.jsx   # Redirects unauthenticated to /login
│       │
│       ├── hooks/
│       │   └── useAuth.js           # login() signup() logout() — wraps API +
│       │                            #   store + navigation + toast
│       ├── services/
│       │   └── api.js               # Axios instance
│       │                            #   • Request interceptor: injects Bearer token
│       │                            #   • Response interceptor: silent token
│       │                            #     refresh on 401, queue concurrent requests
│       ├── store/
│       │   └── authStore.js         # Zustand + persist (sensitive data excluded
│       │                            #   from localStorage)
│       └── utils/
│           └── validation.js        # Per-field validators + getPasswordStrength()
│
└── backend/                         # ── Express 4 + Prisma 5 + PostgreSQL ──────
    ├── .env.example                 # ← COPY TO .env
    ├── package.json                 # includes "prisma": { "seed": ... }
    ├── nodemon.json                 # watches src/ + .env + *.prisma
    │
    ├── prisma/
    │   └── schema.prisma            # datasource (pg) + User model + Role enum
    │                                # Run: npm run db:migrate  to apply
    │
    └── src/
        ├── index.js                 # Bootstrap: CORS, helmet, cookie-parser,
        │                            #   morgan, rate-limit, routes, error handler,
        │                            #   graceful shutdown (SIGTERM/SIGINT)
        │
        ├── config/
        │   ├── prisma.js            # PrismaClient singleton (safe for hot-reload)
        │   ├── database.js          # connectDB() — SELECT 1 health check
        │   └── redis.js             # ioredis client + in-memory Map fallback
        │                            #   exports: cacheGet cacheSet cacheDel
        │
        ├── controllers/
        │   └── authController.js
        │       ├── signup()         # check Redis → check DB → bcrypt → create
        │       │                    #   user → generate tokens → cache email
        │       ├── login()          # find user → compare password → rotate
        │       │                    #   refresh token → cache user id
        │       ├── refresh()        # verify refresh cookie → compare stored hash
        │       │                    #   → issue new pair (rotation)
        │       ├── logout()         # blacklist access token in Redis → null
        │       │                    #   refreshTokenHash in DB → clear cookie
        │       └── getMe()          # Redis cache → DB fallback
        │
        ├── routes/
        │   └── auth.js              # POST /signup /login /refresh /logout
        │                            # GET  /me
        │
        ├── middleware/
        │   ├── auth.js              # authenticate()   — verify Bearer + blacklist
        │   │                        # requireRole(...) — RBAC guard
        │   │                        # optionalAuth()   — attach user if present
        │   ├── rateLimiter.js       # apiLimiter (200/15m global)
        │   │                        # authLimiter (10/15m per IP+email)
        │   │                        # redisRateLimit() — custom factory
        │   ├── validate.js          # Zod signupSchema + loginSchema
        │   │                        # validate(schema) middleware factory
        │   └── errorHandler.js      # Prisma P2002/P2025/P2003 + JWT + generic
        │
        ├── utils/
        │   └── jwt.js               # generateAccessToken / generateRefreshToken
        │                            # verifyAccessToken / verifyRefreshToken
        │                            # hashToken / compareToken
        │                            # refreshCookieOptions
        └── prisma/
            └── seed.js              # Creates admin@example.com / Admin1234!
```

---

## 🚀 Getting Started

### Option A — Docker (recommended, zero manual install)

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env          # DATABASE_URL already matches docker-compose
npm install
npm run db:migrate            # name the migration: init
npm run db:seed               # optional: creates admin user
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open → http://localhost:5173

---

### Option B — Local Postgres + Redis

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE auth_app;"

# 2. Backend
cd backend
cp .env.example .env
# Edit .env → set DATABASE_URL, JWT secrets, etc.
npm install
npm run db:migrate
npm run db:seed               # optional
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
```

---

## 🔧 Environment Variables (`backend/.env`)

```bash
# ── Server ────────────────────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ── PostgreSQL (local / Docker) ───────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/auth_app"

# ── PostgreSQL (AWS RDS — swap this one line in production) ──────────────────
# DATABASE_URL="postgresql://USER:PASS@your-rds-endpoint.rds.amazonaws.com:5432/auth_app?sslmode=require"

# ── JWT (use long random strings — min 32 chars each) ────────────────────────
JWT_ACCESS_SECRET=replace_with_random_32char_string
JWT_REFRESH_SECRET=replace_with_different_random_32char_string
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
# AWS ElastiCache: REDIS_URL=rediss://your-cluster.cache.amazonaws.com:6379

# ── CORS ──────────────────────────────────────────────────────────────────────
CLIENT_URL=http://localhost:5173

# ── Security ──────────────────────────────────────────────────────────────────
BCRYPT_ROUNDS=12
```

---

## 🔑 API Reference

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| `POST` | `/api/auth/signup` | — | `{ name, email, password }` | Register |
| `POST` | `/api/auth/login` | — | `{ email, password }` | Login |
| `POST` | `/api/auth/refresh` | Cookie | — | Rotate tokens |
| `POST` | `/api/auth/logout` | Bearer | — | Revoke session |
| `GET` | `/api/auth/me` | Bearer | — | Current user |
| `GET` | `/api/health` | — | — | Health check |

All auth responses return:
```json
{
  "accessToken": "eyJ...",
  "user": { "id", "name", "email", "role", "isVerified", "createdAt" }
}
```

---

## 🐘 Prisma Cheatsheet

```bash
npm run db:migrate          # create + apply a new migration (dev)
npm run db:migrate:prod     # apply pending migrations (CI/prod, no prompts)
npm run db:studio           # open visual DB browser at localhost:5555
npm run db:seed             # seed admin user
npm run db:reset            # ⚠️  drop + recreate (dev only)
npm run db:generate         # regenerate client after manual schema edits
```

---

## ☁️ Deploying to AWS RDS

1. Create a **PostgreSQL RDS** instance (or Aurora Serverless v2)
2. Set the security group to allow inbound 5432 from your server's IP
3. Update `.env` (or your secrets manager):
   ```bash
   DATABASE_URL="postgresql://USER:PASS@your-rds.rds.amazonaws.com:5432/auth_app?sslmode=require"
   ```
4. Run migrations:
   ```bash
   npm run db:migrate:prod
   ```
That's it — no other code changes needed. Prisma handles the rest.

---

## ⚡ Performance & Security Highlights

| Feature | How |
|---------|-----|
| Duplicate email fast-path | Redis `email:{email}` cache (5 min TTL) skips DB on repeated attempts |
| Login user cache | `user:{email}` → user id cached 60 min |
| `/me` cache | Full user object cached per user id (5 min) |
| Redis fallback | `ioredis` unavailable? In-memory `Map` takes over transparently |
| Token blacklisting | Logged-out access tokens stored in Redis for remaining TTL |
| Refresh rotation | Refresh token replaced on every use; old token immediately invalidated in DB |
| bcrypt hashing | Password + refresh token hash both bcrypt-hashed (configurable rounds) |
| Rate limiting | 10 auth req / 15 min per IP+email; 200 req / 15 min globally |
| Zod validation | All inputs validated before touching DB |
| Helmet | Sets 11 security headers by default |
| httpOnly cookie | Refresh token never accessible to JS |
| Prisma connection pool | Built-in; tune `?connection_limit=N` in `DATABASE_URL` for RDS |

---

## 🏗️ Adding Features

**New protected route:**
```js
// backend/src/routes/profile.js
import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import prisma from '../config/prisma.js'

const router = Router()

router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: req.body.name },
    })
    res.json({ user })
  } catch (err) { next(err) }
})

export default router
```
```js
// backend/src/index.js — add:
import profileRoutes from './routes/profile.js'
app.use('/api', profileRoutes)
```

**Extend the Prisma schema:**
```prisma
model Project {
  id        String   @id @default(uuid())
  title     String
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now()) @map("created_at")
  @@map("projects")
}
```
Then `npm run db:migrate`.

---

## 📦 Production Build

```bash
# Frontend → outputs dist/
cd frontend && npm run build

# Backend — set NODE_ENV=production, then:
cd backend && npm start
```
