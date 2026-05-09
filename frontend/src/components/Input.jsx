import { useState } from 'react'

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
)

export default function Input({
  label, type = 'text', name, value, onChange, onBlur,
  error, placeholder, autoComplete, icon: Icon,
}) {
  const [showPass, setShowPass] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPass ? 'text' : 'password') : type

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <span style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)',
            color: error ? 'var(--error)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
            transition: 'color 0.2s',
          }}>
            <Icon size={16} />
          </span>
        )}
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '15px',
            padding: Icon ? '13px 44px 13px 42px' : '13px 44px 13px 16px',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
            paddingRight: isPassword ? '44px' : '16px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? 'var(--error)' : 'var(--border-focus)'
            e.target.style.boxShadow   = error
              ? '0 0 0 3px rgba(248,113,113,0.1)'
              : '0 0 0 3px var(--accent-glow)'
            e.target.style.background  = 'rgba(255,255,255,0.05)'
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = error ? 'var(--error)' : 'var(--border)'
            e.target.style.boxShadow   = 'none'
            e.target.style.background  = 'rgba(255,255,255,0.03)'
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{
              position: 'absolute', right: '14px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              padding: '2px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <EyeIcon open={showPass} />
          </button>
        )}
      </div>
      {error && (
        <span style={{
          fontSize: '12px', color: 'var(--error)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {error}
        </span>
      )}
    </div>
  )
}
