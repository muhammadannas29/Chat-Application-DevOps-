import { Router } from 'express'
import {
  getConversation,
  getUnreadCounts,
  saveMessage,
} from '../controllers/messagesController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/unread-counts',  authenticate, getUnreadCounts)
router.get('/:userId',        authenticate, getConversation)
router.post('/',              authenticate, saveMessage)

export default router