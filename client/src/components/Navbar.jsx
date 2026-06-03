import { Bell, HelpCircle, Search } from 'lucide-react'
import { useUser, UserButton } from '@clerk/clerk-react'

export default function Navbar() {
  const { user, isLoaded } = useUser()

  const initials = isLoaded && user
    ? (user.fullName || user.firstName || 'U')
        .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'
  const displayName = isLoaded && user
    ? (user.firstName || user.fullName || 'User')
    : 'User'

  return (
    <nav style={{
      height: 64,
      background: '#fff',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      flexShrink: 0,
      zIndex: 50,
      boxShadow: '0 1px 0 var(--border-light)',
      gap: 16,
    }}>

      {/* ── Center search bar ── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
          <Search
            size={15} strokeWidth={2}
            style={{
              position: 'absolute', left: 13, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search jobs, companies or skills..."
            style={{
              width: '100%',
              padding: '10px 52px 10px 38px',
              borderRadius: 12,
              border: '1px solid var(--border-light)',
              background: 'var(--bg-soft)',
              fontSize: 13, fontWeight: 500,
              color: 'var(--text-dark)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--indigo)'
              e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border-light)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            background: '#fff', border: '1px solid var(--border-light)',
            borderRadius: 6, padding: '2px 6px', pointerEvents: 'none',
          }}>
            ⌘ K
          </div>
        </div>
      </div>

      {/* ── Right side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

        {/* Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-soft)', border: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)' }}
          >
            <Bell size={16} strokeWidth={2} color="var(--text-body)" />
          </div>
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 17, height: 17, borderRadius: '50%',
            background: '#ef4444', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#fff',
            lineHeight: 1,
          }}>
            3
          </div>
        </div>

        {/* Help */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-soft)', border: '1px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)' }}
        >
          <HelpCircle size={16} strokeWidth={2} color="var(--text-body)" />
        </div>

        {/* User pill — Clerk UserButton as avatar, name + plan label beside it */}
        {isLoaded && user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '5px 14px 5px 5px',
            borderRadius: 999,
            background: 'var(--bg-soft)',
            border: '1px solid var(--border-light)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--indigo-soft)'; e.currentTarget.style.borderColor = 'var(--indigo-border)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
          >
            {/* Clerk UserButton — clicking opens full profile manager (photo, account, sign out) */}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: {
                    width: 30, height: 30,
                    borderRadius: '50%',
                    border: '2px solid var(--indigo-border)',
                  },
                  userButtonTrigger: {
                    padding: 0,
                    outline: 'none',
                    boxShadow: 'none',
                  },
                }
              }}
            />
            <div style={{ pointerEvents: 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.25 }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--indigo)', lineHeight: 1.2 }}>
                Premium Plan
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
