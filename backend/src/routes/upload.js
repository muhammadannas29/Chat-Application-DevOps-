import { Router }          from 'express'
import { getPresignedUrl } from '../controllers/uploadController.js'
import { authenticate }    from '../middleware/auth.js'

const router = Router()

router.post('/presigned-url', authenticate, getPresignedUrl)

export default router