import { useState, useEffect, useRef, useCallback } from 'react'
import useAuthStore from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { usersApi, messagesApi } from '../services/api'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function avatar(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDate(dateStr) {
  const d   = new Date(dateStr)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function lastSeen(dateStr) {
  if (!dateStr) return 'Never'
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (diff < 1)  return 'Just now'
  if (diff < 60) return `${diff}m ago`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── UserItem ──────────────────────────────────────────────────────────────────
function UserItem({ user, isOnline, isSelected, unread, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', cursor: 'pointer', borderRadius: '10px',
        margin: '2px 8px',
        background: isSelected ? 'rgba(124,101,246,0.15)' : 'transparent',
        border: isSelected ? '1px solid rgba(124,101,246,0.3)' : '1px solid transparent',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: isSelected ? 'linear-gradient(135deg,#7c65f6,#5a45d4)' : 'linear-gradient(135deg,#2a2a3a,#1c1c28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700,
          color: isSelected ? '#fff' : 'var(--text-secondary)',
          fontFamily: 'var(--font-display)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {avatar(user.name)}
        </div>
        <div style={{
          position: 'absolute', bottom: '1px', right: '1px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: isOnline ? '#4fd1c7' : '#3a3a4a',
          border: '2px solid var(--bg-secondary)',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {user.name}
        </div>
        <div style={{ fontSize: '12px', color: isOnline ? '#4fd1c7' : 'var(--text-muted)' }}>
          {isOnline ? 'Online' : lastSeen(user.lastSeenAt)}
        </div>
      </div>
      {unread > 0 && (
        <div style={{
          background: 'var(--accent)', color: '#fff',
          borderRadius: '10px', fontSize: '11px', fontWeight: 700,
          padding: '2px 7px', minWidth: '20px', textAlign: 'center',
        }}>
          {unread > 99 ? '99+' : unread}
        </div>
      )}
    </div>
  )
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({ message, isMine }) {
  return (
    <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
      <div style={{
        maxWidth: '68%', padding: '10px 14px',
        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isMine ? 'linear-gradient(135deg,#7c65f6,#5a45d4)' : 'rgba(255,255,255,0.06)',
        border: isMine ? 'none' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isMine ? '0 2px 12px rgba(124,101,246,0.25)' : 'none',
      }}>
        <p style={{
          fontSize: '14px', lineHeight: 1.5, margin: 0, wordBreak: 'break-word',
          color: isMine ? '#fff' : 'var(--text-primary)',
        }}>
          {message.content}
        </p>
        <div style={{
          fontSize: '10px', marginTop: '4px', textAlign: 'right',
          color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
        }}>
          {formatTime(message.createdAt)}
          {isMine && <span style={{ marginLeft: '4px' }}>{message.isRead ? '✓✓' : '✓'}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── DateSeparator ─────────────────────────────────────────────────────────────
function DateSeparator({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 8px' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

// ─── Empty / placeholder screens ───────────────────────────────────────────────
function EmptyChat({ user }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'linear-gradient(135deg,#7c65f6,#5a45d4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', fontWeight: 800, color: '#fff',
        fontFamily: 'var(--font-display)', marginBottom: '4px',
      }}>
        {avatar(user.name)}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
        {user.name}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
        No messages yet. Say hello!
      </div>
    </div>
  )
}

function SelectUserScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>💬</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--text-secondary)' }}>
        Select a conversation
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
        Pick someone from the list to start chatting
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const currentUser = useAuthStore((s) => s.user)
  const { logout }  = useAuth()

  const [users,        setUsers]        = useState([])
  const [onlineIds,    setOnlineIds]    = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages,     setMessages]     = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [input,        setInput]        = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingMsgs,  setLoadingMsgs]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [sidebarOpen,  setSidebarOpen]  = useState(true)

  const bottomRef       = useRef(null)
  const inputRef        = useRef(null)

  // ── KEY FIX: refs that always hold the latest values ──────────────────────
  // useCallback deps capture values at creation time (stale closure).
  // Refs are mutable and always current — WebSocket handler reads from these.
  const selectedUserRef = useRef(null)
  const currentUserRef  = useRef(currentUser)

  // Keep refs in sync whenever state changes
  useEffect(() => { selectedUserRef.current = selectedUser }, [selectedUser])
  useEffect(() => { currentUserRef.current  = currentUser  }, [currentUser])

  // ── Fetch users + unread counts on mount ──────────────────────────────────
  useEffect(() => {
    usersApi.getAll()
      .then(({ data }) => setUsers(data.users))
      .catch(console.error)
      .finally(() => setLoadingUsers(false))

    messagesApi.getUnreadCounts()
      .then(({ data }) => setUnreadCounts(data.unreadCounts))
      .catch(console.error)
  }, [])

  // ── WebSocket message handler — reads refs, never stale ───────────────────
  const handleMessage = useCallback((message) => {
    const activeId = selectedUserRef.current?.id
    const meId     = currentUserRef.current?.id

    const isActiveChat =
      (message.senderId === activeId   && message.receiverId === meId) ||
      (message.receiverId === activeId && message.senderId   === meId)

    if (isActiveChat) {
      setMessages((prev) => {
        // Deduplicate — sender's optimistic message already added via REST fallback
        if (prev.find((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
    } else if (message.senderId !== meId) {
      // From someone not in the open chat → bump their unread badge
      setUnreadCounts((prev) => ({
        ...prev,
        [message.senderId]: (prev[message.senderId] || 0) + 1,
      }))
    }
  }, []) // ← empty deps intentional: refs handle freshness

  const handleOnlineUsers = useCallback((ids) => setOnlineIds(ids), [])

  const { sendMessage } = useWebSocket({ onMessage: handleMessage, onOnlineUsers: handleOnlineUsers })

  // ── Load conversation when a user is selected ─────────────────────────────
  useEffect(() => {
    if (!selectedUser) return
    setLoadingMsgs(true)
    setMessages([])

    messagesApi.getConversation(selectedUser.id)
      .then(({ data }) => {
        setMessages(data.messages)
        setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }))
      })
      .catch(console.error)
      .finally(() => setLoadingMsgs(false))

    inputRef.current?.focus()
  }, [selectedUser])

  // ── Scroll to bottom whenever messages change ─────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || !selectedUserRef.current) return

    const receiverId = selectedUserRef.current.id
    const sent       = sendMessage(receiverId, content)

    if (!sent) {
      // WebSocket not ready — use REST and show immediately
      messagesApi.send({ receiverId, content })
        .then(({ data }) => setMessages((prev) => [...prev, data.message]))
        .catch(console.error)
    }

    setInput('')
    inputRef.current?.focus()
  }, [input, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Group messages by date ────────────────────────────────────────────────
  const grouped = () => {
    const items = []
    let lastDate = null
    messages.forEach((msg) => {
      const label = formatDate(msg.createdAt)
      if (label !== lastDate) {
        items.push({ type: 'sep', label, id: `sep-${msg.id}` })
        lastDate = label
      }
      items.push({ type: 'msg', ...msg })
    })
    return items
  }

  const filteredUsers  = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )
  const onlineCount = users.filter((u) => onlineIds.includes(u.id)).length

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div style={{
        width: sidebarOpen ? '300px' : '0px', minWidth: sidebarOpen ? '300px' : '0px',
        transition: 'all 0.25s ease', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px',
                background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
                borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)',
              }}>A</div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>
                AppChat
              </span>
            </div>
            <button
              onClick={logout}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-muted)', borderRadius: '7px',
                padding: '5px 8px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'var(--error)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              Sign out
            </button>
          </div>

          {/* Me */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px',
            background: 'rgba(124,101,246,0.08)', borderRadius: '10px',
            border: '1px solid rgba(124,101,246,0.15)', marginBottom: '14px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--accent),#5a45d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#fff',
              fontFamily: 'var(--font-display)', flexShrink: 0,
            }}>
              {avatar(currentUser?.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: '11px', color: '#4fd1c7' }}>● You</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            fontSize: '11px', color: 'var(--text-muted)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            fontWeight: 600, marginBottom: '10px', paddingLeft: '4px',
          }}>
            {onlineCount} online · {users.length} total
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>
              🔍
            </span>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: '8px',
                color: 'var(--text-primary)', fontSize: '13px',
                padding: '8px 12px 8px 32px', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)' }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)';       e.target.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px', paddingTop: '8px' }}>
          {loadingUsers ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {search ? 'No users found' : 'No other users yet'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                isOnline={onlineIds.includes(user.id)}
                isSelected={selectedUser?.id === user.id}
                unread={unreadCounts[user.id] || 0}
                onClick={() => setSelectedUser(user)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          height: '65px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: '12px',
          background: 'var(--bg-secondary)', flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: '7px',
              width: '32px', height: '32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0, transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent';              e.currentTarget.style.color = 'var(--text-muted)' }}
          >☰</button>

          {selectedUser ? (
            <>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#7c65f6,#5a45d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)',
                }}>
                  {avatar(selectedUser.name)}
                </div>
                <div style={{
                  position: 'absolute', bottom: '1px', right: '1px',
                  width: '9px', height: '9px', borderRadius: '50%',
                  background: onlineIds.includes(selectedUser.id) ? '#4fd1c7' : '#3a3a4a',
                  border: '2px solid var(--bg-secondary)',
                }} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>{selectedUser.name}</div>
                <div style={{ fontSize: '12px', color: onlineIds.includes(selectedUser.id) ? '#4fd1c7' : 'var(--text-muted)' }}>
                  {onlineIds.includes(selectedUser.id) ? 'Online' : lastSeen(selectedUser.lastSeenAt)}
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em', color: 'var(--text-secondary)' }}>
              Messages
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
          {!selectedUser ? (
            <SelectUserScreen />
          ) : loadingMsgs ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <EmptyChat user={selectedUser} />
          ) : (
            <>
              {grouped().map((item) =>
                item.type === 'sep'
                  ? <DateSeparator key={item.id} label={item.label} />
                  : <MessageBubble key={item.id} message={item} isMine={item.senderId === currentUser?.id} />
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        {selectedUser && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'flex-end', gap: '12px', flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedUser.name}…`}
              rows={1}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: '12px',
                color: 'var(--text-primary)', fontSize: '14px',
                padding: '12px 16px', outline: 'none', resize: 'none',
                lineHeight: 1.5, transition: 'border-color 0.2s, box-shadow 0.2s',
                maxHeight: '120px', overflowY: 'auto',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--border)';       e.target.style.boxShadow = 'none' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: input.trim() ? 'linear-gradient(135deg,var(--accent),#5a45d4)' : 'rgba(255,255,255,0.06)',
                border: 'none',
                color: input.trim() ? '#fff' : 'var(--text-muted)',
                fontSize: '18px', cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
                boxShadow: input.trim() ? '0 4px 12px rgba(124,101,246,0.3)' : 'none',
              }}
              onMouseEnter={(e) => { if (input.trim()) e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >➤</button>
          </div>
        )}
      </div>
    </div>
  )
}