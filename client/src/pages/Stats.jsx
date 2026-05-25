import { useState, useEffect } from 'react'
import { getStats } from '../lib/api'
import StatBar from '../components/StatBar'
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Layers, CheckCircle2, SkipForward, Target,
  Zap, TrendingUp, Award, BarChart2
} from 'lucide-react'

const FIT_COLORS = {
  '80-100': { fill: '#06b6d4', grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', label: 'Strong' },
  '65-79':  { fill: '#10b981', grad: 'linear-gradient(135deg,#10b981,#06b6d4)', label: 'Good'   },
  '45-64':  { fill: '#f59e0b', grad: 'linear-gradient(135deg,#f59e0b,#f97316)', label: 'Decent' },
  '0-44':   { fill: '#94a3b8', grad: 'linear-gradient(135deg,#94a3b8,#64748b)', label: 'Weak'   },
}

const SOURCE_COLORS = ['#3b82f6','#f97316','#eab308','#8b5cf6','#06b6d4','#22c55e','#ec4899']

const SOURCE_LABELS = {
  linkedin:      '💼 LinkedIn',
  indeed:        '🔵 Indeed',
  naukri:        '🟡 Naukri',
  remotive:      '🟣 Remotive',
  google:        '🔴 Google',
  glassdoor:     '🟢 Glassdoor',
  zip_recruiter: '🔷 ZipRecruiter',
}

const tooltipStyle = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e4e8f4',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    fontSize: 13,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    padding: '10px 14px',
  },
  labelStyle: { fontWeight: 800, color: '#1e2640', marginBottom: 4 },
  cursor: { fill: 'rgba(99,102,241,0.05)' },
}

function GradientBar(props) {
  const { x, y, width, height, fill } = props
  const id = `bar-grad-${fill?.replace('#','')}`
  const tier = Object.values(FIT_COLORS).find(t => t.fill === fill)
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={fill} stopOpacity={1} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={width} height={height}
        fill={`url(#${id})`} rx={6} ry={6} />
    </g>
  )
}

function DonutLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 800, fontSize: 28, fill: '#1e2640',
      }}>{total}</tspan>
      <tspan x={cx} dy="22" style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600, fontSize: 12, fill: '#8b94b8',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>Sources</tspan>
    </text>
  )
}

export default function Stats() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats()
      .then(r => { setStats(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 72px)', gap: 16,
      background: 'var(--bg-page)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid var(--indigo-border)',
        borderTopColor: 'var(--indigo)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>
        Loading analytics...
      </span>
    </div>
  )

  if (!stats) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 72px)', color: 'var(--text-muted)',
      fontSize: 15, fontWeight: 600,
    }}>
      No data available yet
    </div>
  )

  const scoreDistData = stats.score_distribution
    ? Object.entries(stats.score_distribution).map(([range, count]) => ({
        range,
        count: parseInt(count) || 0,
        fill: FIT_COLORS[range]?.fill || '#94a3b8',
        label: FIT_COLORS[range]?.label || range,
      }))
    : []

  const sourcesData = (stats.sources || []).map(s => ({
    name: SOURCE_LABELS[s.source] || s.source,
    value: parseInt(s.count) || 0,
  }))

  const dailyData = (stats.daily_applications || []).map(d => ({
    date: (d.date || '').slice(5),
    count: parseInt(d.count) || 0,
  }))

  const totalSources = sourcesData.reduce((s, d) => s + d.value, 0)

  const metrics = [
    {
      label: 'Total Jobs',
      value: stats.total || 0,
      icon: Layers,
      grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      bg: 'var(--indigo-soft)', iconColor: '#6366f1',
      border: 'var(--indigo-border)',
    },
    {
      label: 'In Queue',
      value: stats.total_new || 0,
      icon: Target,
      grad: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
      bg: 'var(--blue-soft)', iconColor: '#3b82f6',
      border: 'var(--blue-border)',
    },
    {
      label: 'Applied',
      value: stats.total_applied || 0,
      icon: CheckCircle2,
      grad: 'linear-gradient(135deg,#10b981,#22c55e)',
      bg: 'var(--green-soft)', iconColor: '#10b981',
      border: 'var(--green-border)',
    },
    {
      label: 'Skipped',
      value: stats.total_skipped || 0,
      icon: SkipForward,
      grad: 'linear-gradient(135deg,#f59e0b,#f97316)',
      bg: 'var(--orange-soft)', iconColor: '#f59e0b',
      border: 'var(--orange-border)',
    },
    {
      label: 'Avg Score',
      value: stats.avg_score || 0,
      icon: TrendingUp,
      grad: 'linear-gradient(135deg,#eab308,#f59e0b)',
      bg: 'var(--yellow-soft)', iconColor: '#eab308',
      border: 'var(--yellow-border)',
    },
    {
      label: 'Strong Fit',
      value: stats.strong_fit || 0,
      icon: Zap,
      grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
      bg: '#ecfeff', iconColor: '#06b6d4',
      border: '#a5f3fc',
    },
    {
      label: 'Good Fit',
      value: stats.good_fit || 0,
      icon: Award,
      grad: 'linear-gradient(135deg,#10b981,#06b6d4)',
      bg: 'var(--green-soft)', iconColor: '#10b981',
      border: 'var(--green-border)',
    },
    {
      label: 'Applied Today',
      value: stats.applied_today || 0,
      icon: BarChart2,
      grad: 'linear-gradient(135deg,#ec4899,#8b5cf6)',
      bg: 'var(--pink-soft)', iconColor: '#ec4899',
      border: 'var(--pink-border)',
    },
  ]

  const cardStyle = {
    background: '#fff',
    border: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  }

  return (
    <div style={{
      height: 'calc(100vh - 136px)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      overflow: 'hidden',
      gap: 0,
    }}>

      {/* ── CARD 1 — Summary ── */}
      <div style={cardStyle}>
        <div style={{
          height: 5, flexShrink: 0,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)',
        }} />
        <div style={{
          padding: '14px 20px 10px',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={15} strokeWidth={2} color="var(--indigo)" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '0.01em' }}>
            Summary
          </span>
        </div>
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          alignContent: 'start',
        }}>
          {metrics.map(({ label, value, icon: Icon, grad, bg, iconColor, border }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 12,
              background: bg,
              border: `1px solid ${border}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                flexShrink: 0,
              }}>
                <Icon size={17} strokeWidth={2} color={iconColor} />
              </div>
              <div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800, fontSize: 24, lineHeight: 1,
                  background: grad,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {value}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  marginTop: 3,
                  textTransform: 'uppercase',
                }}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CARD 2 — Score Distribution ── */}
      <div style={{ ...cardStyle, borderLeft: '1px solid var(--border-light)' }}>
        <div style={{
          height: 5, flexShrink: 0,
          background: 'linear-gradient(90deg, #06b6d4, #3b82f6, #6366f1)',
        }} />
        <div style={{
          padding: '14px 20px 10px',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--blue-soft)', border: '1px solid var(--blue-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={15} strokeWidth={2} color="var(--blue)" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>
            Score Distribution
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(FIT_COLORS).map(([range, { fill, label }]) => (
              <span key={range} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700,
                background: '#f8fafc',
                border: '1px solid var(--border-light)',
                borderRadius: 999, padding: '3px 10px',
                color: 'var(--text-body)',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: fill, flexShrink: 0 }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: '16px 20px 12px' }}>
          {scoreDistData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistData} margin={{ top: 8, right: 8, left: -10, bottom: 4 }} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8b94b8', fontSize: 13, fontFamily: "'Plus Jakarta Sans'", fontWeight: 700 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8b94b8', fontSize: 12, fontFamily: "'Plus Jakarta Sans'", fontWeight: 600 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, _, props) => [`${v} jobs`, props.payload?.label || '']}
                />
                <Bar dataKey="count" shape={<GradientBar />} radius={[8,8,0,0]}>
                  {scoreDistData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600,
            }}>
              No score data yet
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 3 — Source Breakdown ── */}
      <div style={{ ...cardStyle, borderTop: '1px solid var(--border-light)' }}>
        <div style={{
          height: 5, flexShrink: 0,
          background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)',
        }} />
        <div style={{
          padding: '14px 20px 10px',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--purple-soft)', border: '1px solid var(--purple-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={15} strokeWidth={2} color="var(--purple)" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>
            Source Breakdown
          </span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          padding: '12px 20px', gap: 24, overflow: 'hidden',
        }}>
          {sourcesData.length > 0 ? (
            <>
              <div style={{ width: 200, height: '100%', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcesData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      dataKey="value" nameKey="name"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {sourcesData.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v, n) => [`${v} jobs`, n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {sourcesData.map(({ name, value }, i) => {
                  const color = SOURCE_COLORS[i % SOURCE_COLORS.length]
                  const pct = totalSources > 0 ? Math.round((value / totalSources) * 100) : 0
                  return (
                    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: color, flexShrink: 0,
                          }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
                            {name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                            {pct}%
                          </span>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 14, fontWeight: 800,
                            color: color,
                          }}>
                            {value}
                          </span>
                        </div>
                      </div>
                      <div style={{
                        height: 5, borderRadius: 999,
                        background: 'var(--border-light)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          background: color,
                          width: `${pct}%`,
                          opacity: 0.8,
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600,
            }}>
              No source data yet
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 4 — Daily Applications ── */}
      <div style={{ ...cardStyle, borderTop: '1px solid var(--border-light)', borderLeft: '1px solid var(--border-light)' }}>
        <div style={{
          height: 5, flexShrink: 0,
          background: 'linear-gradient(90deg, #8b5cf6, #6366f1, #06b6d4)',
        }} />
        <div style={{
          padding: '14px 20px 10px',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--purple-soft)', border: '1px solid var(--purple-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={15} strokeWidth={2} color="var(--purple)" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>
            Daily Applications
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
            background: 'var(--bg-soft)', border: '1px solid var(--border-light)',
            borderRadius: 999, padding: '3px 10px',
          }}>
            Last 14 days
          </span>
        </div>
        <div style={{ flex: 1, padding: '16px 20px 12px' }}>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="60%"  stopColor="#8b5cf6" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8b94b8', fontSize: 12, fontFamily: "'Plus Jakarta Sans'", fontWeight: 600 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8b94b8', fontSize: 12, fontFamily: "'Plus Jakarta Sans'", fontWeight: 600 }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [`${v} application${v !== 1 ? 's' : ''}`, 'Applied']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={{ fill: '#6366f1', r: 5, strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: '#8b5cf6', strokeWidth: 0, boxShadow: '0 0 0 4px rgba(139,92,246,0.2)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '100%', gap: 10,
            }}>
              <TrendingUp size={40} strokeWidth={1.5} color="var(--text-disabled)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
                No applications tracked yet
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-disabled)' }}>
                Start applying to see your progress here
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}