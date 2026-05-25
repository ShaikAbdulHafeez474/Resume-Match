import { Link, useLocation } from 'react-router-dom'
import { Sparkles, RefreshCw, Briefcase, CheckCircle, SkipForward, BarChart2 } from 'lucide-react'
import { useUser, UserButton } from '@clerk/clerk-react'

const TAB_CONFIG = [
  { path: '/dashboard', label: 'Jobs',    icon: Briefcase   },
  { path: '/applied',   label: 'Applied', icon: CheckCircle },
  { path: '/skipped',   label: 'Skipped', icon: SkipForward },
  { path: '/stats',     label: 'Stats',   icon: BarChart2   },
]

export default function Navbar({ onFetchClick, fetchLoading }) {
  const location = useLocation()
  const { user, isLoaded } = useUser()

  return (
    <nav style={{
      width: '100%',
      height: 72,
      background: '#fff',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      flexShrink: 0,
      position: 'relative',
      zIndex: 50,
      boxShadow: '0 1px 0 var(--border-light), 0 2px 8px rgba(0,0,0,0.04)',
    }}>

      {/* ── Logo ── */}
      <Link to="/dashboard" style={{
        textDecoration: 'none',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(99,102,241,0.35)',
        }}>
          <Sparkles size={18} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <div style={{
            fontWeight: 800, fontSize: 20, lineHeight: 1.1,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.01em',
          }}>
            RésuMatch
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}>
            AI Job Matcher
          </div>
        </div>
      </Link>

      {/* ── Center Tabs ── */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-soft)',
        border: '1px solid var(--border-light)',
        borderRadius: 14, padding: 4, gap: 2,
      }}>
        {TAB_CONFIG.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 10,
                background: active
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'transparent',
                color: active ? '#fff' : 'var(--text-body)',
                fontWeight: 700, fontSize: 14,
                boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = '#fff'
                  e.currentTarget.style.color = 'var(--text-dark)'
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-body)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              <Icon size={14} strokeWidth={2.5} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* ── Right Side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

        {/* Fetch New Jobs button — only on dashboard */}
        {location.pathname === '/dashboard' && onFetchClick && (
          <button
            onClick={onFetchClick}
            disabled={fetchLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 12,
              background: fetchLoading
                ? 'var(--border-light)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: fetchLoading ? 'var(--text-muted)' : '#fff',
              fontWeight: 700, fontSize: 14,
              border: 'none', cursor: fetchLoading ? 'not-allowed' : 'pointer',
              boxShadow: fetchLoading ? 'none' : '0 4px 12px rgba(99,102,241,0.35)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => {
              if (!fetchLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(99,102,241,0.45)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = fetchLoading ? 'none' : '0 4px 12px rgba(99,102,241,0.35)'
            }}
            onMouseDown={e => { if (!fetchLoading) e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { if (!fetchLoading) e.currentTarget.style.transform = 'translateY(-1px)' }}
          >
            <RefreshCw
              size={15} strokeWidth={2.5}
              style={{ animation: fetchLoading ? 'spin 1s linear infinite' : 'none' }}
            />
            {fetchLoading ? 'Fetching...' : 'Fetch New Jobs'}
          </button>
        )}

        {/* Clerk user avatar + info */}
        {isLoaded && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px 8px 8px',
              borderRadius: 999,
              background: 'var(--bg-soft)',
              border: '1px solid var(--border-light)',
            }}>
              {/* Initials avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 12, color: '#fff',
                flexShrink: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {(user.fullName || user.firstName || 'U')
                  .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.2 }}>
                  {user.firstName || user.fullName || 'User'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                  {user.primaryEmailAddress?.emailAddress || ''}
                </div>
              </div>
            </div>

            {/* Clerk UserButton — handles sign out, profile etc */}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: {
                    width: 34, height: 34,
                    borderRadius: 10,
                    border: '2px solid var(--indigo-border)',
                  }
                }
              }}
            />
          </div>
        )}
      </div>
    </nav>
  )
}