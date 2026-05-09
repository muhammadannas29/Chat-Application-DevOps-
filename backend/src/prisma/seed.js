// backend/src/prisma/seed.js
// Run with:  npm run db:seed
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from '../config/prisma.js'

async function main() {
  const email = 'admin@example.com'
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log('ℹ️  Seed user already exists — skipping')
    return
  }

  const passwordHash = await bcrypt.hash('Admin1234!', 12)

  const user = await prisma.user.create({
    data: {
      name:         'Admin User',
      email,
      passwordHash,
      role:         'ADMIN',
      isVerified:   true,
    },
  })

  console.log('✅ Seed user created:', user.email)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
