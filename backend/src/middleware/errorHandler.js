export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`)

  // Prisma known errors
  // P2002 = Unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field'
    return res.status(409).json({ message: `${field} already in use` })
  }
  // P2025 = Record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' })
  }
  // P2003 = Foreign key constraint
  if (err.code === 'P2003') {
    return res.status(400).json({ message: 'Invalid reference' })
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' })
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' })
  }

  // Zod / custom validation
  if (err.status === 400) {
    return res.status(400).json({ message: err.message })
  }

  const status  = err.status || err.statusCode || 500
  const message = status === 500 ? 'Internal server error' : err.message
  res.status(status).json({ message })
}
