import prisma from './prisma.js'

export async function connectDB() {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ PostgreSQL connected via Prisma')
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message)
    console.error('   Make sure DATABASE_URL is set correctly in .env')
    process.exit(1)
  }
}

export async function disconnectDB() {
  await prisma.$disconnect()
}
