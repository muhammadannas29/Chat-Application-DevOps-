import { Router } from 'express'
import { getUsers } from '../controllers/usersController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, getUsers)

export default router