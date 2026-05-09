import { Router } from 'express'
import { signup, login, refresh, logout, getMe } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'
import { validate, signupSchema, loginSchema } from '../middleware/validate.js'

const router = Router()

router.post('/signup',  authLimiter, validate(signupSchema), signup)
router.post('/login',   authLimiter, validate(loginSchema),  login)
router.post('/refresh', refresh)
router.post('/logout',  authenticate, logout)
router.get('/me',       authenticate, getMe)

export default router
