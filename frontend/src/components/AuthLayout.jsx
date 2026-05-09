import { useEffect, useRef } from 'react'

// Animated orb background
function OrbCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0
    let raf

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const orbs = [
      { x: 0.15, y: 0.2,  r: 320, color: [124, 101, 246], speed: 0.0003 },
      { x: 0.82, y: 0.75, r: 280, color: [79, 209, 199],  speed: 0.0005 },
      { x: 0.5,  y: 0.9,  r: 200, color: [124, 101, 246], speed: 0.0007 },
    ]

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      orbs.forEach((orb, i) => {
        const dx = Math.sin(frame * orb.speed + i * 2) * 40
        const dy = Math.cos(frame * orb.speed + i) * 30
        const cx = canvas.width  * orb.x + dx
        const cy = canvas.height * orb.y + dy

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orb.r)
        grad.addColorStop(0,   `rgba(${orb.color.join(',')},0.14)`)
        grad.addColorStop(0.5, `rgba(${orb.color.join(',')},0.05)`)
        grad.addColorStop(1,   `rgba(${orb.color.join(',')},0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, orb.r, 0, Math.PI * 2)
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  )
}

export default function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '20px',
    }}>
      <OrbCanvas />

      {/* Noise texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        pointerEvents: 'none',
        opacity: 0.4,
      }} />

      {/* Logo */}
      <div style={{
        position: 'fixed', top: '28px', left: '36px',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px',
        animation: 'fadeIn 0.6s ease',
      }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 800,
          color: '#fff',
          fontFamily: 'var(--font-display)',
        }}>A</div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '16px',
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>AppName</span>
      </div>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: '440px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '44px 40px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.4)',
        animation: 'fadeUp 0.5s var(--transition)',
      }}>
        {children}
      </div>
    </div>
  )
}
