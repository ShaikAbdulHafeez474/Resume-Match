import { useState, useEffect } from 'react'
import { getAppliedJobs, getStats } from '../lib/api'
import StatBar from '../components/StatBar'
import EmptyState from '../components/EmptyState'
import { MapPin, ExternalLink, Briefcase, Clock, TrendingUp, Building2, CheckCircle2 } from 'lucide-react'

const SOURCE_STYLES = {
  linkedin:      { background: '#e8f0fe', color: '#1d4ed8' },
  indeed:        { background: '#fff0e6', color: '#c2410c' },
  naukri:        { background: '#fef9e7', color: '#b45309' },
  remotive:      { background: '#f5f3ff', color: '#7c3aed' },
  google:        { background: '#fef9e7', color: '#b45309' },
  glassdoor:     { background: '#f0fdf4', color: '#15803d' },
}

const FIT_TIER = {
  strong: { grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', label: 'STRONG FIT', bg: '#eff6ff', border: '#bfdbfe', dot: '#06b6d4' },
  good:   { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', label: 'GOOD FIT',   bg: '#f0fdf4', border: '#bbf7d0', dot: '#10b981' },
  decent: { grad: 'linear-gradient(135deg,#f59e0b,#f97316)', label: 'DECENT FIT', bg: '#fff7ed', border: '#fed7aa', dot: '#f59e0b' },
  weak:   { grad: 'linear-gradient(135deg,#94a3b8,#64748b)', label: 'WEAK FIT',   bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
}

function getTier(score) {
  const s = parseInt(score) || 0
  if (s >= 80) return FIT_TIER.strong
  if (s >= 65) return FIT_TIER.good
  if (s >= 45) return FIT_TIER.decent
  return FIT_TIER.weak
}

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

function formatAppliedDate(dateStr) {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Applied today'
    if (diffDays === 1) return 'Applied yesterday'
    if (diffDays < 7) return `Applied ${diffDays}d ago`
    return `Applied ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
  } catch { return dateStr }
}

const CHIP_CLASSES = ['chip-0', 'chip-1', 'chip-2', 'chip-3', 'chip-4']

export default function Applied() {
  const [jobs, setJobs]     = useState([])
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAppliedJobs(), getStats()])
      .then(([j, s]) => {
        setJobs(j.data.jobs || [])
        setStats(s.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Compute right panel stats
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((sum, j) => sum + (parseInt(j.fit_score) || 0), 0) / jobs.length)
    : 0

  const sourceCounts = jobs.reduce((acc, j) => {
    const src = (j.source || 'unknown').toLowerCase()
    acc[src] = (acc[src] || 0) + 1
    return acc
  }, {})

  const topCompanies = [...new Map(jobs.map(j => [j.company, j])).values()].slice(0, 6)

  const tierCounts = jobs.reduce((acc, j) => {
    const s = parseInt(j.fit_score) || 0
    if (s >= 80) acc.strong++
    else if (s >= 65) acc.good++
    else if (s >= 45) acc.decent++
    else acc.weak++
    return acc
  }, { strong: 0, good: 0, decent: 0, weak: 0 })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 72px)', overflow: 'hidden',
    }}>
      <StatBar stats={stats} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT COLUMN — Applied job cards ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 20px 16px 24px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {/* Header row */}
          {!loading && jobs.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              background: 'var(--green-soft)',
              border: '1px solid var(--green-border)',
              borderRadius: 12, marginBottom: 4,
            }}>
              <CheckCircle2 size={18} strokeWidth={2} color="#15803d" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} applied
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#166534', marginLeft: 4 }}>
                · Keep it up! Consistency is key.
              </span>
            </div>
          )}

          {loading ? (
            /* Skeleton */
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: '20px 24px',
                border: '1px solid var(--border-light)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div className="skeleton-shimmer" style={{ height: 14, width: '60%' }} />
                <div className="skeleton-shimmer" style={{ height: 20, width: '80%' }} />
                <div className="skeleton-shimmer" style={{ height: 13, width: '40%' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="skeleton-shimmer" style={{ height: 26, width: 80 }} />
                  <div className="skeleton-shimmer" style={{ height: 26, width: 80 }} />
                </div>
              </div>
            ))
          ) : jobs.length === 0 ? (
            <EmptyState type="applied" />
          ) : (
            jobs.map((job, index) => {
              const tier = getTier(job.fit_score)
              const src = (job.source || 'unknown').toLowerCase()
              const srcStyle = SOURCE_STYLES[src] || { background: '#f0f2f8', color: 'var(--text-muted)' }

              const skills = Array.isArray(job.match_skills)
                ? job.match_skills
                : typeof job.match_skills === 'string'
                  ? job.match_skills.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean)
                  : []
              const highlights = (job.fit_highlights || '').split(',').map(s => s.trim()).filter(Boolean)
              const chips = skills.length > 0 ? skills : highlights

              const fitReason = job.fit_reason && job.fit_reason !== 'Could not score automatically.'
                ? job.fit_reason : null

              return (
                <div
                  key={job.id}
                  className="animate-slide-up"
                  style={{
                    animationDelay: `${index * 40}ms`,
                    width: '100%',
                    background: '#fff',
                    border: '1px solid var(--border-light)',
                    borderLeft: '4px solid #22c55e',
                    borderRadius: 16,
                    padding: '20px 24px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    opacity: 0.95,
                    display: 'flex', flexDirection: 'column', gap: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.opacity = '0.95'
                  }}
                >
                  {/* ROW 1 — badges left, applied date + score right */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 14,
                  }}>
                    {/* Left badges */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        ...srcStyle, borderRadius: 999,
                        padding: '5px 13px', fontSize: 12, fontWeight: 700,
                        textTransform: 'capitalize',
                      }}>
                        {src.charAt(0).toUpperCase() + src.slice(1)}
                      </span>
                      {job.is_remote && (
                        <span style={{
                          background: 'var(--indigo-soft)', color: 'var(--indigo)',
                          borderRadius: 999, padding: '5px 13px',
                          fontSize: 12, fontWeight: 700,
                          border: '1px solid var(--indigo-border)',
                        }}>Remote</span>
                      )}
                      {/* Applied badge */}
                      <span style={{
                        background: 'var(--green-soft)', color: '#15803d',
                        borderRadius: 999, padding: '5px 13px',
                        fontSize: 12, fontWeight: 700,
                        border: '1px solid var(--green-border)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <CheckCircle2 size={12} strokeWidth={2.5} />
                        {formatAppliedDate(job.applied_at)}
                      </span>
                    </div>

                    {/* Right: score */}
                    <div style={{
                      background: tier.bg, borderRadius: 14,
                      padding: '8px 14px', textAlign: 'center', flexShrink: 0,
                      border: `1px solid ${tier.border}`,
                      minWidth: 76,
                    }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 800, fontSize: 32, lineHeight: 1,
                        background: tier.grad,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        {parseInt(job.fit_score) || 0}
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                        color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap',
                      }}>
                        {tier.label}
                      </div>
                    </div>
                  </div>

                  {/* ROW 2 — title + company */}
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={{
                      fontWeight: 800, fontSize: 18,
                      color: 'var(--text-dark)', lineHeight: 1.25, marginBottom: 6,
                    }}>
                      {job.title || 'Untitled Position'}
                    </h3>
                    <p style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--text-body)',
                      display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
                    }}>
                      <Briefcase size={13} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700 }}>{job.company || 'Unknown Company'}</span>
                      <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>·</span>
                      <MapPin size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>{job.location || 'Location not specified'}</span>
                    </p>
                  </div>

                  {/* DIVIDER */}
                  <div style={{ borderTop: '1px solid var(--border-light)', margin: '0 0 12px' }} />

                  {/* ROW 3 — fit reason */}
                  {fitReason && (
                    <div style={{
                      background: 'var(--indigo-soft)', borderRadius: 10,
                      padding: '10px 14px', marginBottom: 12,
                      borderLeft: '3px solid var(--indigo)',
                    }}>
                      <p style={{
                        fontSize: 13, fontWeight: 500, fontStyle: 'italic',
                        color: 'var(--text-body)', lineHeight: 1.6, margin: 0,
                      }}>
                        <span style={{ color: 'var(--indigo)', fontStyle: 'normal', marginRight: 6, fontWeight: 700 }}>✦</span>
                        {fitReason}
                      </p>
                    </div>
                  )}

                  {/* ROW 4 — chips + salary + view link */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: 8,
                    paddingTop: 4,
                    borderTop: '1px solid var(--border-light)',
                  }}>
                    {/* Chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {chips.slice(0, 4).map((chip, i) => (
                        <span
                          key={`${chip}-${i}`}
                          className={CHIP_CLASSES[i % CHIP_CLASSES.length]}
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12, fontWeight: 600,
                            borderRadius: 8, padding: '5px 12px',
                          }}
                        >
                          {chip}
                        </span>
                      ))}
                      {job.salary_display && (
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          background: 'var(--green-soft)', color: '#15803d',
                          border: '1px solid var(--green-border)',
                          borderRadius: 8, padding: '5px 12px',
                        }}>
                          💰 {job.salary_display}
                        </span>
                      )}
                    </div>

                    {/* View link */}
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 13, fontWeight: 700,
                          color: 'var(--indigo)', textDecoration: 'none',
                          background: 'var(--indigo-soft)',
                          border: '1px solid var(--indigo-border)',
                          borderRadius: 10, padding: '7px 16px',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--indigo)'
                          e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--indigo-soft)'
                          e.currentTarget.style.color = 'var(--indigo)'
                        }}
                      >
                        <ExternalLink size={13} strokeWidth={2} />
                        View Job
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          width: 420, flexShrink: 0,
          borderLeft: '1px solid var(--border-light)',
          background: '#fff', overflowY: 'auto',
          padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
        }}>

          {/* Card 1 — Big stat */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
            borderRadius: 16, padding: '24px 20px', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800, fontSize: 56, color: '#fff',
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {jobs.length}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.85)', fontWeight: 700,
              fontSize: 15, marginTop: 8,
            }}>
              Jobs Applied
            </div>
            {avgScore > 0 && (
              <div style={{
                marginTop: 12,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 999, padding: '6px 18px',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <TrendingUp size={14} strokeWidth={2} color="#fff" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                  Avg fit score: {avgScore}
                </span>
              </div>
            )}
          </div>

          {/* Card 2 — Fit breakdown */}
          {jobs.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid var(--border-light)',
              padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div className="section-heading">Match Quality</div>
              {[
                { label: 'Strong Fit (80+)', count: tierCounts.strong, tier: FIT_TIER.strong },
                { label: 'Good Fit (65–79)', count: tierCounts.good,   tier: FIT_TIER.good },
                { label: 'Decent Fit (45–64)', count: tierCounts.decent, tier: FIT_TIER.decent },
                { label: 'Weak Fit (<45)',   count: tierCounts.weak,   tier: FIT_TIER.weak },
              ].map(({ label, count, tier }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-light)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: tier.dot, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>
                      {label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 16, fontWeight: 800,
                    background: tier.grad,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Card 3 — Source breakdown */}
          {Object.keys(sourceCounts).length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid var(--border-light)',
              padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div className="section-heading">Applied via</div>
              {Object.entries(sourceCounts).map(([src, count]) => {
                const srcStyle = SOURCE_STYLES[src] || { background: '#f0f2f8', color: 'var(--text-muted)' }
                const total = jobs.length
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={src} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 0', borderBottom: '1px solid var(--border-light)',
                  }}>
                    <span style={{
                      ...srcStyle, borderRadius: 999,
                      padding: '4px 12px', fontSize: 12, fontWeight: 700,
                      textTransform: 'capitalize', flexShrink: 0,
                    }}>
                      {src.charAt(0).toUpperCase() + src.slice(1)}
                    </span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        background: srcStyle.color,
                        width: `${pct}%`,
                        opacity: 0.7,
                      }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)', flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Card 4 — Top companies */}
          {topCompanies.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid var(--border-light)',
              padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} strokeWidth={2} />
                Companies
              </div>
              {topCompanies.map((j, i) => {
                const avatarColors = [
                  { bg: '#fdf2f8', color: '#ec4899', border: '#fbcfe8' },
                  { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
                  { bg: '#f0fdf4', color: '#22c55e', border: '#bbf7d0' },
                  { bg: '#fff7ed', color: '#f97316', border: '#fed7aa' },
                  { bg: '#f5f3ff', color: '#8b5cf6', border: '#ddd6fe' },
                  { bg: '#fefce8', color: '#eab308', border: '#fde047' },
                ]
                const c = avatarColors[i % avatarColors.length]
                return (
                  <div key={j.company} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 0', borderBottom: '1px solid var(--border-light)',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: c.bg, border: `1px solid ${c.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13, color: c.color, flexShrink: 0,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      {(j.company || 'U')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 14, color: 'var(--text-dark)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {j.company || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                        {j.location || 'Location unknown'}
                      </div>
                    </div>
                    {j.apply_url && (
                      <a
                        href={j.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--indigo)', flexShrink: 0 }}
                      >
                        <ExternalLink size={14} strokeWidth={2} />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}