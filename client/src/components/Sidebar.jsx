import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, Sparkles, FileText, BarChart2, Settings, Crown,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { path: '/jobs',          label: 'Jobs',          icon: Briefcase       },
  { path: '/optimizations', label: 'Optimizations', icon: Sparkles        },
  { path: '/resume',        label: 'Resume',        icon: FileText        },
  { path: '/insights',      label: 'Insights',      icon: BarChart2       },
  { path: '/settings',      label: 'Settings',      icon: Settings        },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <div style={{
      width: 220,
      flexShrink: 0,
      height: '100%',
      background: '#fff',
      borderRight: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: '20px 16px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 8px rgba(99,102,241,0.35)',
          flexShrink: 0,
        }}>
          <Sparkles size={16} color="#fff" strokeWidth={2} />
        </div>
        <div style={{
          fontWeight: 800, fontSize: 17,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.01em',
        }}>
          ResuMatch
        </div>
      </div>

      {/* ── Main Nav ── */}
      <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={label}
              to={path}
              style={{
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10,
                background: isActive ? '#6366f1' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-body)',
                fontWeight: isActive ? 700 : 600,
                fontSize: 14,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-soft)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={15} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Spacer ── */}
      <div style={{ flex: 1, minHeight: 16 }} />

      {/* ── Unlock Premium Card ── */}
      <div style={{ padding: '0 10px 16px', flexShrink: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
          borderRadius: 14, padding: 16,
          boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Crown size={16} color="#fbbf24" strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Unlock Premium</span>
          </div>
          <p style={{
            fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.78)',
            lineHeight: 1.55, margin: '0 0 12px',
          }}>
            Get more matches, AI tools and priority support
          </p>
          <button
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8,
              background: '#fff', color: '#6366f1',
              fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  )
}
