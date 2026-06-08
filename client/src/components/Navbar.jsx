import { useState, useEffect, useRef } from 'react'
import { Bell, HelpCircle, X, CheckCircle2, Briefcase, TrendingUp, Sparkles, BookOpen, Keyboard, ChevronRight, ArrowLeft } from 'lucide-react'
import { useUser, UserButton } from '@clerk/clerk-react'
import { getDashboardStats, getRecentActivity } from '../lib/api'

// ── Ticker Tips ───────────────────────────────────────────────────────────
const STATIC_TIPS = [
  'Tailor your resume for each job to boost your ATS score by up to 30 points',
  'Jobs with 80%+ fit score are 3x more likely to get you an interview',
  'Keep your resume under 1 page for fresher roles — recruiters spend 6 seconds on it',
  'Add keywords from the job description directly into your resume bullets',
  'Apply within 3 days of posting — early applicants get 3x more callbacks',
  'Quantify your achievements — numbers make your resume stand out instantly',
  'Use action verbs: Built, Designed, Optimized, Led, Reduced, Increased',
  'Mirror the exact skill names from the JD — ATS is case and spelling sensitive',
]

function TickerTips({ stats }) {
  const tips = []
  if (stats?.strongFitJobs > 0)
    tips.push(`You have ${stats.strongFitJobs} strong fit job${stats.strongFitJobs > 1 ? 's' : ''} — tailor your resume to maximize chances`)
  if (stats?.avgAtsImprovement > 0)
    tips.push(`Your avg ATS boost is +${stats.avgAtsImprovement} pts — keep tailoring to push above 80`)
  if (stats?.applications > 0)
    tips.push(`${stats.applications} application${stats.applications > 1 ? 's' : ''} submitted — aim for 10 this month`)
  STATIC_TIPS.forEach(t => tips.push(t))

  // Each sentence separated by a wide spaced bullet for clear visual gap
  const separator = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0•\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'
  const fullText = tips.join(separator)

  return (
    <div style={{
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      // full width — no maxWidth cap, no margin auto
    }}>
      {/* Fade edges */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg, #fff 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(270deg, #fff 60%, transparent)', zIndex: 2, pointerEvents: 'none' }} />

      <div className="ticker-text">
        <span style={{ paddingRight: '6rem' }}>{fullText}</span>
        <span style={{ paddingRight: '6rem' }}>{fullText}</span>
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        .ticker-text {
          display: flex;
          white-space: nowrap;
          font-size: 20px;
          font-weight: 800;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: 0.01em;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #06b6d4, #6366f1);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ticker 120s linear infinite, gradientShift 6s linear infinite;
        }
      `}</style>
    </div>
  )
}

// ── Real Notifications ────────────────────────────────────────────────────
function NotificationDropdown({ onClose, onMarkRead }) {
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          getDashboardStats().catch(() => ({ data: {} })),
          getRecentActivity().catch(() => ({ data: { activities: [] } })),
        ])
        const stats      = statsRes.data
        const activities = activityRes.data.activities || []
        const built = []

        // Strong fit jobs available
        if (stats.strongFitJobs > 0) {
          built.push({
            id: 'strong-fit',
            icon: <Sparkles size={14} strokeWidth={2} color="#6366f1" />,
            bg: 'var(--indigo-soft)',
            title: `${stats.strongFitJobs} strong fit job${stats.strongFitJobs > 1 ? 's' : ''} waiting`,
            desc: 'These match your resume with 80%+ score — apply before they expire',
            time: 'Now',
          })
        }

        // ATS improvement
        if (stats.avgAtsImprovement > 0) {
          built.push({
            id: 'ats',
            icon: <TrendingUp size={14} strokeWidth={2} color="#10b981" />,
            bg: 'var(--green-soft)',
            title: `Avg ATS boost: +${stats.avgAtsImprovement} pts`,
            desc: 'Your resume tailoring sessions are working — keep going',
            time: 'Today',
          })
        }

        // Recent applications
        const applied = activities.filter(a => a.type === 'applied').slice(0, 2)
        applied.forEach(a => {
          built.push({
            id: `applied-${a.title}`,
            icon: <CheckCircle2 size={14} strokeWidth={2} color="#10b981" />,
            bg: 'var(--green-soft)',
            title: `Applied to ${a.title}`,
            desc: `at ${a.company} — consider sending a follow-up in 7 days`,
            time: relTime(a.timestamp),
          })
        })

        // Recent optimizations
        const opts = activities.filter(a => a.type === 'optimized').slice(0, 1)
        opts.forEach(a => {
          built.push({
            id: `opt-${a.title}`,
            icon: <Sparkles size={14} strokeWidth={2} color="#8b5cf6" />,
            bg: 'var(--purple-soft)',
            title: `Resume tailored for ${a.title}`,
            desc: `at ${a.company} — download or copy the improvements`,
            time: relTime(a.timestamp),
          })
        })

        setNotifs(built)
      } catch {
        setNotifs([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function relTime(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={{ position: 'absolute', top: 44, right: 0, width: 340, zIndex: 9999, background: '#fff', borderRadius: 16, border: '1px solid var(--border-light)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>Notifications</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--bg-soft)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 13, background: 'var(--bg-soft)', borderRadius: 6, width: '70%' }} />
                  <div style={{ height: 11, background: 'var(--bg-soft)', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <Bell size={28} strokeWidth={1.5} color="var(--text-disabled)" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>No notifications yet</p>
            <p style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>Start applying and tailoring to see updates here</p>
          </div>
        ) : (
          notifs.map((n, i) => (
            <div key={n.id} style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: i < notifs.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-soft)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {n.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 3 }}>{n.time}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mark all as read */}
      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onMarkRead}
          style={{
            fontSize: 12, fontWeight: 700, color: 'var(--indigo)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            padding: '4px 12px', borderRadius: 8,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--indigo-soft)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          ✓ Mark all as read
        </button>
      </div>
    </div>
  )
}

// ── Help Sub-modal ────────────────────────────────────────────────────────
const HELP_CONTENT = {
  ats: {
    title: 'How does ATS scoring work?',
    icon: '🎯',
    sections: [
      { heading: 'What is ATS?', body: 'ATS (Applicant Tracking System) is software recruiters use to filter resumes before a human reads them. It scans for keywords, skills, and experience that match the job description.' },
      { heading: 'How we calculate your score', body: 'We compare your resume against the job description using AI. We look at skill matches, keyword presence, experience alignment, and education relevance. The score is out of 100.' },
      { heading: 'What is a good score?', body: '80–100: Strong match, high chance of being shortlisted\n65–79: Good match, minor improvements needed\n45–64: Decent, significant gaps exist\nBelow 45: High risk of auto-rejection' },
      { heading: 'How to improve', body: 'Use the "Tailor Resume" feature on any job card. Paste the job description and our AI will suggest keyword additions and rewrites for each section.' },
    ]
  },
  tailoring: {
    title: 'What is resume tailoring?',
    icon: '✨',
    sections: [
      { heading: 'What tailoring does', body: 'Instead of one generic resume, tailoring customizes your existing content for each specific job. We only enhance what you already have — no invented experience.' },
      { heading: 'How it works', body: '1. Click "Tailor Resume" on any job card\n2. Paste the job description\n3. AI analyzes your resume vs the JD\n4. Get section-by-section improvements with keywords added naturally' },
      { heading: 'What we change', body: 'We rewrite your existing bullet points to include missing keywords while keeping the same meaning. We never add experience or skills you don\'t have.' },
      { heading: 'Saving improvements', body: 'After reviewing, save the improvements. They get mapped to that specific job so you can view them anytime from the job card.' },
    ]
  },
  shortcuts: {
    title: 'Keyboard shortcuts',
    icon: '⌨️',
    sections: [
      { heading: 'Navigation', body: 'D — Go to Dashboard\nJ — Go to Jobs\nA — Go to Applied\nS — Go to Skipped' },
      { heading: 'Job actions', body: 'Enter — Open selected job\nT — Tailor resume for selected job\nSpace — Skip job\nM — Mark as applied' },
      { heading: 'General', body: 'Esc — Close any modal\n/ — Focus search bar\n? — Open this help panel' },
    ]
  },
  improve: {
    title: 'How to get above 80 ATS score?',
    icon: '📈',
    sections: [
      { heading: 'Step 1 — Match keywords exactly', body: 'Copy the exact skill names from the JD. If they say "Node.js" don\'t write "NodeJS". ATS is literal about spelling and casing.' },
      { heading: 'Step 2 — Quantify everything', body: 'Replace "worked on" with "Built X that reduced Y by Z%". Numbers signal impact and get flagged positively by ATS systems.' },
      { heading: 'Step 3 — Use action verbs', body: 'Start every bullet with: Built, Designed, Led, Reduced, Increased, Implemented, Optimized, Automated, Deployed, Integrated.' },
      { heading: 'Step 4 — Tailor per job', body: 'A single tailoring session typically adds 15–25 ATS points. Tailor your top 5 jobs and you\'ll see immediate improvement in shortlisting rates.' },
    ]
  },
}

function HelpSubModal({ itemKey, onBack }) {
  const content = HELP_CONTENT[itemKey]
  if (!content) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-modal header */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={13} strokeWidth={2.5} color="var(--text-muted)" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{content.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>{content.title}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 18px' }}>
        {content.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.heading}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.75, whiteSpace: 'pre-line', background: 'var(--bg-soft)', borderRadius: 10, padding: '10px 14px' }}>
              {s.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HelpDropdown({ onClose }) {
  const [activeItem, setActiveItem] = useState(null)

  const HELP_ITEMS = [
    { key: 'ats',       icon: '🎯', label: 'How does ATS scoring work?',   desc: 'Learn how we match your resume to jobs' },
    { key: 'tailoring', icon: '✨', label: 'What is resume tailoring?',    desc: 'AI-powered section-by-section improvements' },
    { key: 'shortcuts', icon: '⌨️', label: 'Keyboard shortcuts',           desc: 'Navigate faster with shortcuts' },
    { key: 'improve',   icon: '📈', label: 'How to get above 80 ATS?',     desc: 'Tips to boost your score quickly' },
  ]

  return (
    <div style={{ position: 'absolute', top: 44, right: 0, width: 320, zIndex: 9999, background: '#fff', borderRadius: 16, border: '1px solid var(--border-light)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', maxHeight: 420 }}>

      {/* Top header — always visible */}
      {!activeItem && (
        <div style={{ padding: '14px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>Help & Resources</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {activeItem ? (
        <div style={{ height: 380 }}>
          <HelpSubModal itemKey={activeItem} onBack={() => setActiveItem(null)} />
        </div>
      ) : (
        <>
          {HELP_ITEMS.map((item, i) => (
            <div key={item.key} onClick={() => setActiveItem(item.key)} style={{ display: 'flex', gap: 12, padding: '12px 18px', cursor: 'pointer', borderBottom: i < HELP_ITEMS.length - 1 ? '1px solid var(--border-light)' : 'none', alignItems: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-soft)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{item.label}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <ChevronRight size={13} strokeWidth={2} color="var(--text-disabled)" />
            </div>
          ))}
          <div style={{ padding: '12px 18px', background: 'var(--indigo-soft)', borderTop: '1px solid var(--indigo-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--indigo)' }}>📧 support@resumatch.ai</div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Navbar ───────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, isLoaded } = useUser()
  const [stats, setStats]       = useState(null)
  const [showBell, setShowBell] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [notifCount, setNotifCount] = useState(0)

  const displayName = isLoaded && user
    ? (user.firstName || user.fullName || 'User')
    : 'User'

  useEffect(() => {
    getDashboardStats().then(res => {
      const s = res.data
      setStats(s)
      // Rough unread count based on real data
      let count = 0
      if (s.strongFitJobs > 0) count++
      if (s.avgAtsImprovement > 0) count++
      setNotifCount(count)
    }).catch(() => {})
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showBell && !showHelp) return
    const handler = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setShowBell(false)
        setShowHelp(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBell, showHelp])

  return (
    <nav style={{
      height: 72,
      background: '#fff',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      flexShrink: 0,
      zIndex: 100,
      position: 'relative',
      gap: 16,
      overflow: 'visible',
    }}>

      {/* Center — Ticker */}
      <TickerTips stats={stats} />

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

        {/* Bell */}
        <div data-dropdown style={{ position: 'relative' }}>
          <div onClick={() => { setShowBell(p => !p); setShowHelp(false) }} style={{
            width: 36, height: 36, borderRadius: 10,
            background: showBell ? 'var(--indigo-soft)' : 'var(--bg-soft)',
            border: `1px solid ${showBell ? 'var(--indigo-border)' : 'var(--border-light)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Bell size={16} strokeWidth={2} color={showBell ? 'var(--indigo)' : 'var(--text-body)'} />
          </div>
          {notifCount > 0 && (
            <div style={{ position: 'absolute', top: -4, right: -4, width: 17, height: 17, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', pointerEvents: 'none' }}>
              {notifCount}
            </div>
          )}
          {showBell && <NotificationDropdown onClose={() => setShowBell(false)} onMarkRead={() => { setNotifCount(0); setShowBell(false) }} />}
        </div>

        {/* Help */}
        <div data-dropdown style={{ position: 'relative' }}>
          <div onClick={() => { setShowHelp(p => !p); setShowBell(false) }} style={{
            width: 36, height: 36, borderRadius: 10,
            background: showHelp ? 'var(--indigo-soft)' : 'var(--bg-soft)',
            border: `1px solid ${showHelp ? 'var(--indigo-border)' : 'var(--border-light)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <HelpCircle size={16} strokeWidth={2} color={showHelp ? 'var(--indigo)' : 'var(--text-body)'} />
          </div>
          {showHelp && <HelpDropdown onClose={() => setShowHelp(false)} />}
        </div>

        {/* User pill */}
        {isLoaded && user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '5px 14px 5px 5px', borderRadius: 999,
            background: 'var(--bg-soft)', border: '1px solid var(--border-light)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--indigo-soft)'; e.currentTarget.style.borderColor = 'var(--indigo-border)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
          >
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: { width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--indigo-border)' }, userButtonTrigger: { padding: 0, outline: 'none', boxShadow: 'none' } } }} />
            <div style={{ pointerEvents: 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.25 }}>{displayName}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--indigo)', lineHeight: 1.2 }}>Premium Plan</div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}