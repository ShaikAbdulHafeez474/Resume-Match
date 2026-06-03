import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { BarChart2, TrendingUp, Target } from 'lucide-react'
import { getAtsTrend, getTopSkills, getDashboardStats, getStats } from '../lib/api'

function EmptyChart({ message }) {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
      <BarChart2 size={32} strokeWidth={1.5} color="var(--text-muted)" />
      <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 220 }}>{message}</p>
    </div>
  )
}

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981']

export default function Insights() {
  const [atsTrend,  setAtsTrend]  = useState({ trend: [], avgBefore: null, avgAfter: null })
  const [topSkills, setTopSkills] = useState([])
  const [dashStats, setDashStats] = useState(null)
  const [jobStats,  setJobStats]  = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getAtsTrend().catch(() => ({ data: { trend: [], avgBefore: null, avgAfter: null } })),
      getTopSkills().catch(() => ({ data: { skills: [] } })),
      getDashboardStats().catch(() => ({ data: {} })),
      getStats().catch(() => ({ data: {} })),
    ]).then(([trend, skills, dash, job]) => {
      setAtsTrend(trend.data)
      setTopSkills(skills.data.skills || [])
      setDashStats(dash.data)
      setJobStats(job.data)
    }).catch(() => toast.error('Failed to load insights'))
      .finally(() => setLoading(false))
  }, [])

  const chartData = atsTrend.trend.map(r => ({
    date:   new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    Before: r.before,
    After:  r.after,
  }))

  const pieData = [
    { name: 'Applied', value: dashStats?.applications     || 0 },
    { name: 'Skipped', value: jobStats?.total_skipped      || 0 },
    { name: 'Saved',   value: dashStats?.savedOptimizations || 0 },
  ].filter(d => d.value > 0)

  const skillsBarData = topSkills.map(({ skill, pct }) => ({
    skill: skill.charAt(0).toUpperCase() + skill.slice(1),
    pct,
  }))

  const successCount = atsTrend.trend.filter(r => r.after > r.before).length

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg-page)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Insights</h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Track your job search performance and trends.</p>
      </div>

      {/* Top row — 2 charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* ATS Score Trend */}
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>ATS Score Trend</div>
          {chartData.length === 0
            ? <EmptyChart message="Complete your first optimization to see trends." />
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Before" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="After"  stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
                {atsTrend.avgBefore != null && (
                  <div style={{ display: 'flex', gap: 20, marginTop: 14, justifyContent: 'center' }}>
                    {[{ label: 'Avg Before', val: atsTrend.avgBefore, color: '#94a3b8' }, { label: 'Avg After', val: atsTrend.avgAfter, color: '#6366f1' }].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: 'center', padding: '10px 20px', background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 800, color }}>{val}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          }
        </div>

        {/* Application Status */}
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>Application Status</div>
          {pieData.length === 0
            ? <EmptyChart message="Start applying to jobs to see your status breakdown." />
            : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val, name) => [val, name]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
                  {pieData.map(({ name, value }, i) => (
                    <div key={name} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: PIE_COLORS[i] }}>{value}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{name}</div>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>

      {/* Bottom row — 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>

        {/* Top Hiring Skills */}
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>Top Hiring Skills</div>
          {skillsBarData.length === 0
            ? <EmptyChart message="Optimize some resumes to see skill demand." />
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={skillsBarData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: 'var(--text-body)' }} width={80} />
                  <Tooltip formatter={val => [`${val}%`]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="pct" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Optimization Success */}
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>Optimization Success</div>
          {dashStats?.savedOptimizations > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: TrendingUp, label: 'Avg ATS Improvement', value: dashStats?.avgAtsImprovement != null ? `+${dashStats.avgAtsImprovement}` : '—', color: '#6366f1' },
                { icon: Target,    label: 'Total Optimizations',  value: dashStats?.savedOptimizations ?? 0, color: '#10b981' },
                { icon: BarChart2, label: 'Successful (+score)',  value: successCount, color: '#f59e0b' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} strokeWidth={2} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, color }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="No optimizations yet." />
          )}
        </div>

        {/* Job Source Breakdown */}
        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 16 }}>Job Sources</div>
          {(jobStats?.sources || []).length === 0
            ? <EmptyChart message="Fetch some jobs to see source breakdown." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(jobStats?.sources || []).slice(0, 5).map(({ source, count }, i) => {
                  const total = jobStats.sources.reduce((s, r) => s + parseInt(r.count), 0)
                  const pct   = total > 0 ? Math.round((parseInt(count) / total) * 100) : 0
                  const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899']
                  return (
                    <div key={source} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', textTransform: 'capitalize' }}>{source}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: colors[i % colors.length] }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 999 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}
