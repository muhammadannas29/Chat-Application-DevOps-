import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'
import {
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, hashToken, compareToken,
  refreshCookieOptions,
} from '../utils/jwt.js'
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js'

// ─── Helper: public user shape ─────────────────────────────────────────────────
function toPublic(user) {
  return {
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    isVerified: user.isVerified,
    createdAt:  user.createdAt,
  }
}

// ─── Signup ────────────────────────────────────────────────────────────────────
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body

    // Fast-path: Redis knows this email is taken
    const cachedExists = await cacheGet(`email:${email}`)
    if (cachedExists) {
      return res.status(409).json({ message: 'Email already in use' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      await cacheSet(`email:${email}`, true, 300)
      return res.status(409).json({ message: 'Email already in use' })
    }

    const rounds      = parseInt(process.env.BCRYPT_ROUNDS) || 12
    const passwordHash = await bcrypt.hash(password, rounds)

    const accessToken  = generateAccessToken({ id: 'pending', role: 'USER' })
    const refreshToken = generateRefreshToken({ id: 'pending' })
    const refreshHash  = await hashToken(refreshToken)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        refreshTokenHash: refreshHash,
        lastLoginAt: new Date(),
      },
    })

    // Re-generate tokens now that we have the real user id
    const finalAccess  = generateAccessToken({ id: user.id})
    const finalRefresh = generateRefreshToken({ id: user.id })

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await hashToken(finalRefresh) },
    })

    await cacheSet(`email:${email}`, true, 300)

    res.cookie('refresh_token', finalRefresh, refreshCookieOptions)
    res.status(201).json({
      message: 'Account created',
      accessToken: finalAccess,
      user: toPublic(user),
    })
  } catch (err) {
    // Prisma unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Email already in use' })
    }
    next(err)
  }
}

// ─── Login ─────────────────────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const accessToken  = generateAccessToken({ id: user.id, role: user.role })
    const refreshToken = generateRefreshToken({ id: user.id })

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await hashToken(refreshToken),
        lastLoginAt: new Date(),
      },
    })

    // Cache user id by email for fast lookups (60 min)
    await cacheSet(`user:${email}`, { id: user.id }, 3600)

    res.cookie('refresh_token', refreshToken, refreshCookieOptions)
    res.json({
      message: 'Login successful',
      accessToken,
      user: toPublic(user),
    })
  } catch (err) {
    next(err)
  }
}

// ─── Refresh token ─────────────────────────────────────────────────────────────
export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refresh_token
    if (!token) return res.status(401).json({ message: 'No refresh token' })

    const decoded = verifyRefreshToken(token)
    const user    = await prisma.user.findUnique({ where: { id: decoded.id } })

    if (!user?.refreshTokenHash) {
      return res.status(401).json({ message: 'Invalid session' })
    }

    const isValid = await compareToken(token, user.refreshTokenHash)
    if (!isValid) return res.status(401).json({ message: 'Invalid refresh token' })

    const newAccessToken  = generateAccessToken({ id: user.id })
    const newRefreshToken = generateRefreshToken({ id: user.id })

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await hashToken(newRefreshToken) },
    })

    res.cookie('refresh_token', newRefreshToken, refreshCookieOptions)
    res.json({ accessToken: newAccessToken })
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired, please log in' })
    }
    next(err)
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────────
export async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.slice(7)

    // Blacklist the access token for its remaining TTL (~15 min)
    if (token) {
      await cacheSet(`bl:${token.slice(-12)}`, true, 900)
    }

    if (req.user?.id) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshTokenHash: null },
      })
      // Invalidate any cached user data
      const userRec = await cacheGet(`me:${req.user.id}`)
      if (userRec?.email) await cacheDel(`user:${userRec.email}`)
      await cacheDel(`me:${req.user.id}`)
    }

    res.clearCookie('refresh_token', { path: '/api/auth' })
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
}

// ─── Get current user ──────────────────────────────────────────────────────────
export async function getMe(req, res, next) {
  try {
    const cached = await cacheGet(`me:${req.user.id}`)
    if (cached) return res.json({ user: cached })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) return res.status(404).json({ message: 'User not found' })

    const publicUser = toPublic(user)
    await cacheSet(`me:${req.user.id}`, publicUser, 300)
    res.json({ user: publicUser })
  } catch (err) {
    next(err)
  }
}
