import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Briefcase, CheckCircle2, Sparkles, X, RefreshCw,
  TrendingUp, ArrowRight, BarChart2,
} from 'lucide-react'
import {
  getDashboardStats, getRecentActivity, getAtsTrend, getTopSkills,
  getActiveResume,
} from '../lib/api'

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function CircleProgress({ pct, size = 56, stroke = 5, color = '#6366f1' }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  )
}

function Skeleton({ h = 16, w = '100%', r = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, var(--bg-soft) 25%, var(--border-light) 50%, var(--bg-soft) 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function StatCard({ icon: Icon, iconBg, iconColor, value, label, description, ctaLabel, ctaPath }) {
  const navigate = useNavigate()
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border-light)',
      borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 160px', minWidth: 0,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} strokeWidth={2} color={iconColor} />
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>{description}</div>
      {ctaLabel && (
        <button onClick={() => navigate(ctaPath)} style={{
          marginTop: 4, padding: '8px 14px', borderRadius: 9,
          background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)',
          color: 'var(--indigo)', fontWeight: 700, fontSize: 12,
          cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
          display: 'flex', alignItems: 'center', gap: 5,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--indigo-soft)' }}
        >
          {ctaLabel} <ArrowRight size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

function ActivityIcon({ type }) {
  if (type === 'applied')   return <CheckCircle2 size={14} strokeWidth={2} color="#10b981" />
  if (type === 'optimized') return <Sparkles     size={14} strokeWidth={2} color="var(--indigo)" />
  if (type === 'skipped')   return <X            size={14} strokeWidth={2} color="#94a3b8" />
  return <Briefcase size={14} strokeWidth={2} color="var(--text-muted)" />
}

function activityText(a) {
  if (a.type === 'applied')   return `Applied to ${a.title} at ${a.company}`
  if (a.type === 'optimized') return `Optimized resume for ${a.title} at ${a.company}`
  if (a.type === 'skipped')   return `Skipped ${a.title} at ${a.company}`
  if (a.type === 'saved')     return `Saved ${a.title} at ${a.company}`
  if (a.type === 'restored')  return `Restored ${a.title} at ${a.company}`
  return `${a.type} — ${a.title}`
}

// ── Activity Modal ────────────────────────────────────────────────────────
function ActivityModal({ onClose }) {
  const [all, setAll]         = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentActivity(true)
      .then(res => setAll(res.data.activities || []))
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,14,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>All Activity</h2>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', margin: '3px 0 0' }}>Your last 50 actions across the app</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 24px 20px' }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <Skeleton h={28} w={28} r="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skeleton h={13} /><Skeleton h={11} w="35%" />
                </div>
              </div>
            ))
          ) : all.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No activity yet.</div>
          ) : (
            all.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 0', borderBottom: i < all.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <ActivityIcon type={a.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', lineHeight: 1.45 }}>{activityText(a)}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>{relativeTime(a.timestamp)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Top Skills Modal ──────────────────────────────────────────────────────
function TopSkillsModal({ skills, onClose }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,14,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>All Skills in Demand</h2>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', margin: '3px 0 0' }}>Extracted from your tailored job descriptions</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px 20px' }}>
          {skills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Tailor a resume to start building your skills map.
            </div>
          ) : (
            skills.map(({ skill, pct, count }, i) => (
              <div key={skill} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", minWidth: 20 }}>#{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', textTransform: 'capitalize' }}>{skill}</span>
                    {count && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-soft)', border: '1px solid var(--border-light)', borderRadius: 999, padding: '1px 7px' }}>{count}x</span>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--indigo)', fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, var(--indigo), #8b5cf6)`, borderRadius: 999, transition: 'width 0.6s' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }   = useUser()
  const navigate   = useNavigate()

  const [stats,        setStats]        = useState(null)
  const [activity,     setActivity]     = useState([])
  const [atsTrend,     setAtsTrend]     = useState({ trend: [], avgBefore: null, avgAfter: null })
  const [topSkills,    setTopSkills]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showActivity, setShowActivity] = useState(false)
  const [showSkills,   setShowSkills]   = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [statsRes, activityRes, trendRes, skillsRes] = await Promise.all([
        getDashboardStats().catch(() => ({ data: {} })),
        getRecentActivity().catch(() => ({ data: { activities: [] } })),
        getAtsTrend().catch(() => ({ data: { trend: [], avgBefore: null, avgAfter: null } })),
        getTopSkills().catch(() => ({ data: { skills: [] } })),
      ])
      setStats(statsRes.data)
      setActivity(activityRes.data.activities || [])
      setAtsTrend(trendRes.data)
      setTopSkills(skillsRes.data.skills || [])
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const healthColor = (pct) => pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  const healthLabel = (pct) => pct >= 70 ? 'Good' : pct >= 50 ? 'Fair' : 'Needs Work'

  const chartData = atsTrend.trend.map(r => ({
    date:   new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    Before: r.before,
    After:  r.after,
    title:  r.title,
  }))

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'there'

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg-page)' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
          Welcome back, {firstName}! 👋
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>
          Here's your job search overview
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ flex: '1 1 160px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton h={40} w={40} r={12} /><Skeleton h={32} w="60%" /><Skeleton h={14} /><Skeleton h={14} w="70%" />
            </div>
          ))
        ) : (
          <>
            {stats?.resumeHealth != null && (
              <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20, flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative', width: 56, height: 56 }}>
                  <CircleProgress pct={stats.resumeHealth} color={healthColor(stats.resumeHealth)} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: healthColor(stats.resumeHealth) }}>
                    {stats.resumeHealth}%
                  </div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800, color: healthColor(stats.resumeHealth) }}>{healthLabel(stats.resumeHealth)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>Resume Health</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>Keep improving your resume to unlock better matches.</div>
                <button onClick={() => navigate('/resume')} style={{ padding: '8px 14px', borderRadius: 9, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', color: 'var(--indigo)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                  Improve Resume <ArrowRight size={11} />
                </button>
              </div>
            )}
            {(stats?.strongFitJobs ?? 0) > 0 && (
              <StatCard icon={Briefcase} iconBg="var(--indigo-soft)" iconColor="var(--indigo)"
                value={stats.strongFitJobs} label="Strong Fit Jobs"
                description="Jobs with high relevance to your profile."
                ctaLabel="View Jobs" ctaPath="/jobs?filter=strong_fit" />
            )}
            <StatCard icon={CheckCircle2} iconBg="var(--green-soft)" iconColor="#10b981"
              value={stats?.applications ?? 0} label="Applications"
              description="Total applications submitted."
              ctaLabel="View Applied" ctaPath="/jobs?filter=applied" />
            <StatCard icon={Sparkles} iconBg="var(--purple-soft)" iconColor="var(--purple)"
              value={stats?.savedOptimizations ?? 0} label="Optimizations"
              description="Resume optimizations saved for jobs."
              ctaLabel="View All" ctaPath="/optimizations" />
            {stats?.avgAtsImprovement != null && (
              <StatCard icon={TrendingUp} iconBg="var(--blue-soft)" iconColor="var(--blue)"
                value={`+${stats.avgAtsImprovement}`} label="Avg ATS Boost"
                description="Average ATS improvement across all jobs."
                ctaLabel="See Insights" ctaPath="/insights" />
            )}
          </>
        )}
      </div>

      {/* 3-column section */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>

        {/* LEFT — Recent Activity — fixed height, 5 items only */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>Recent Activity</span>
            <button onClick={() => setShowActivity(true)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer' }}>
              View All
            </button>
          </div>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <Skeleton h={28} w={28} r="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skeleton h={13} /><Skeleton h={11} w="40%" />
                </div>
              </div>
            ))
          ) : activity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No activity yet. Start exploring jobs.
            </div>
          ) : (
            activity.slice(0, 3).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: i < Math.min(activity.length, 3) - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <ActivityIcon type={a.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', lineHeight: 1.4 }}>{activityText(a)}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>{relativeTime(a.timestamp)}</div>
                </div>
              </div>
            ))
          )}

          {activity.length > 0 && (
            <button onClick={() => setShowActivity(true)} style={{ marginTop: 14, width: '100%', padding: '9px 0', borderRadius: 9, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              View All Activity →
            </button>
          )}
        </div>

        {/* CENTER — ATS Trend */}
        <div style={{ flex: 1.5, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>ATS Improvement Trend</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--indigo-soft)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', borderRadius: 999, padding: '3px 10px' }}>Last 30 days</span>
          </div>
          {loading ? <Skeleton h={180} r={12} /> : chartData.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <BarChart2 size={32} strokeWidth={1.5} color="var(--text-muted)" />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 200 }}>Complete your first resume optimization to see trends.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 12 }} />
                <Line type="monotone" dataKey="Before" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="After"  stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {atsTrend.avgBefore != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: '#94a3b8' }}>{atsTrend.avgBefore}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Avg Before</div>
              </div>
              <ArrowRight size={18} strokeWidth={2.5} color="var(--indigo)" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color: '#6366f1' }}>{atsTrend.avgAfter}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Avg After</div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Top Skills */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>Top Skills in Demand</span>
          </div>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ marginBottom: 14 }}><Skeleton h={12} w="60%" /><div style={{ marginTop: 6 }}><Skeleton h={6} /></div></div>)
          ) : topSkills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
              Tailor a resume to start tracking which skills appear most across your target job descriptions.
            </div>
          ) : (
            topSkills.slice(0, 5).map(({ skill, pct, count }) => (
              <div key={skill} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', textTransform: 'capitalize' }}>{skill}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {count && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{count}x</span>}
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--indigo)', fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--indigo), #8b5cf6)', borderRadius: 999, transition: 'width 0.6s' }} />
                </div>
              </div>
            ))
          )}

          {/* View All — opens modal with max 20 skills */}
          <button
            onClick={() => setShowSkills(true)}
            style={{ marginTop: 6, width: '100%', padding: '9px 0', borderRadius: 9, background: 'var(--bg-soft)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            View All Skills →
          </button>
        </div>
      </div>

      {/* Modals */}
      {showActivity && <ActivityModal onClose={() => setShowActivity(false)} />}
      {showSkills   && <TopSkillsModal skills={topSkills.slice(0, 20)} onClose={() => setShowSkills(false)} />}
    </div>
  )
}