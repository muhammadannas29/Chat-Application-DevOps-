import { z } from 'zod'

export const signupSchema = z.object({
  name:     z.string().min(2).max(80).trim(),
  email:    z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
})

export const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1),
})

// Middleware factory
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.errors[0]?.message || 'Validation failed'
      return res.status(400).json({ message })
    }
    req.body = result.data
    next()
  }
}
