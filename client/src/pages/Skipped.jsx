import { useState, useEffect } from 'react'
import { getSkippedJobs, unskipJob, getStats } from '../lib/api'
import StatBar from '../components/StatBar'
import EmptyState from '../components/EmptyState'
import { toast } from 'sonner'
import { MapPin, RotateCcw, SkipForward, Briefcase, Clock, TrendingUp } from 'lucide-react'

const SOURCE_STYLES = {
  linkedin:  { background: '#e8f0fe', color: '#1d4ed8' },
  indeed:    { background: '#fff0e6', color: '#c2410c' },
  naukri:    { background: '#fef9e7', color: '#b45309' },
  remotive:  { background: '#f5f3ff', color: '#7c3aed' },
  google:    { background: '#fef9e7', color: '#b45309' },
  glassdoor: { background: '#f0fdf4', color: '#15803d' },
}

const FIT_TIER = {
  strong: { grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', label: 'STRONG', bg: '#eff6ff', border: '#bfdbfe', dot: '#06b6d4' },
  good:   { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', label: 'GOOD',   bg: '#f0fdf4', border: '#bbf7d0', dot: '#10b981' },
  decent: { grad: 'linear-gradient(135deg,#f59e0b,#f97316)', label: 'DECENT', bg: '#fff7ed', border: '#fed7aa', dot: '#f59e0b' },
  weak:   { grad: 'linear-gradient(135deg,#94a3b8,#64748b)', label: 'WEAK',   bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
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
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch { return null }
}

const CHIP_CLASSES = ['chip-0', 'chip-1', 'chip-2', 'chip-3', 'chip-4']

export default function Skipped() {
  const [jobs, setJobs]     = useState([])
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSkippedJobs(), getStats()])
      .then(([j, s]) => {
        setJobs(j.data.jobs || [])
        setStats(s.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleUnskip = async (jobId, title) => {
    try {
      await unskipJob(jobId)
      setJobs(prev => prev.filter(j => j.id !== jobId))
      toast(`↩ Restored "${title}" to queue`)
    } catch {
      toast.error('Failed to restore job')
    }
  }

  // Right panel stats
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((s, j) => s + (parseInt(j.fit_score) || 0), 0) / jobs.length)
    : 0

  const tierCounts = jobs.reduce((acc, j) => {
    const s = parseInt(j.fit_score) || 0
    if (s >= 80) acc.strong++
    else if (s >= 65) acc.good++
    else if (s >= 45) acc.decent++
    else acc.weak++
    return acc
  }, { strong: 0, good: 0, decent: 0, weak: 0 })

  const sourceCounts = jobs.reduce((acc, j) => {
    const src = (j.source || 'unknown').toLowerCase()
    acc[src] = (acc[src] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 72px)', overflow: 'hidden',
    }}>
      <StatBar stats={stats} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 20px 16px 24px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {/* Header banner */}
          {!loading && jobs.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              background: 'var(--orange-soft)',
              border: '1px solid var(--orange-border)',
              borderRadius: 12, marginBottom: 4,
            }}>
              <SkipForward size={18} strokeWidth={2} color="var(--orange)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
                {jobs.length} skipped job{jobs.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#9a3412', marginLeft: 4 }}>
                · Restore any job to move it back to your queue
              </span>
            </div>
          )}

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16, padding: '18px 24px',
                border: '1px solid var(--border-light)', opacity: 0.7,
                display: 'flex', gap: 16, alignItems: 'center',
              }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton-shimmer" style={{ height: 18, width: '55%' }} />
                  <div className="skeleton-shimmer" style={{ height: 13, width: '35%' }} />
                </div>
                <div className="skeleton-shimmer" style={{ height: 36, width: 80, borderRadius: 10 }} />
              </div>
            ))
          ) : jobs.length === 0 ? (
            <EmptyState type="skipped" />
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
              const chips = (skills.length > 0 ? skills : highlights).slice(0, 3)

              return (
                <div
                  key={job.id}
                  className="animate-slide-up"
                  style={{
                    animationDelay: `${index * 40}ms`,
                    width: '100%',
                    background: '#fff',
                    border: '1px solid var(--border-light)',
                    borderLeft: '4px solid var(--orange)',
                    borderRadius: 16,
                    padding: '18px 22px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    opacity: 0.82,
                    display: 'flex', flexDirection: 'column', gap: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '0.82'
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  {/* ROW 1 — badges + date */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        ...srcStyle, borderRadius: 999,
                        padding: '4px 12px', fontSize: 12, fontWeight: 700,
                        textTransform: 'capitalize',
                      }}>
                        {src.charAt(0).toUpperCase() + src.slice(1)}
                      </span>
                      {job.is_remote && (
                        <span style={{
                          background: 'var(--indigo-soft)', color: 'var(--indigo)',
                          borderRadius: 999, padding: '4px 12px',
                          fontSize: 12, fontWeight: 700,
                          border: '1px solid var(--indigo-border)',
                        }}>Remote</span>
                      )}
                      {/* Skipped badge */}
                      <span style={{
                        background: 'var(--orange-soft)', color: 'var(--orange)',
                        borderRadius: 999, padding: '4px 12px',
                        fontSize: 12, fontWeight: 700,
                        border: '1px solid var(--orange-border)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <SkipForward size={11} strokeWidth={2.5} />
                        Skipped
                      </span>
                    </div>
                    {job.posted_at && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        color: 'var(--text-muted)', fontSize: 12, fontWeight: 500,
                      }}>
                        <Clock size={11} strokeWidth={1.5} />
                        {formatDate(job.posted_at)}
                      </span>
                    )}
                  </div>

                  {/* ROW 2 — title + score + restore button */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', gap: 16, marginBottom: 12,
                  }}>
                    {/* Left: title + company */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontWeight: 800, fontSize: 17,
                        color: 'var(--text-dark)', lineHeight: 1.25, marginBottom: 5,
                      }}>
                        {job.title || 'Untitled Position'}
                      </h3>
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text-body)',
                        display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
                      }}>
                        <Briefcase size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontWeight: 700 }}>{job.company || 'Unknown Company'}</span>
                        <span style={{ color: 'var(--text-disabled)' }}>·</span>
                        <MapPin size={11} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                        <span>{job.location || 'Location not specified'}</span>
                      </p>
                    </div>

                    {/* Right: score + restore */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{
                        background: tier.bg, borderRadius: 12,
                        padding: '8px 12px', textAlign: 'center',
                        border: `1px solid ${tier.border}`,
                        minWidth: 64,
                      }}>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 800, fontSize: 28, lineHeight: 1,
                          background: tier.grad,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}>
                          {parseInt(job.fit_score) || 0}
                        </div>
                        <div style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                          color: 'var(--text-muted)', marginTop: 2,
                        }}>
                          {tier.label}
                        </div>
                      </div>

                      {/* Restore button */}
                      <button
                        onClick={() => handleUnskip(job.id, job.title)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '10px 18px', borderRadius: 10,
                          background: 'var(--indigo-soft)',
                          border: '1px solid var(--indigo-border)',
                          color: 'var(--indigo)',
                          fontWeight: 700, fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(99,102,241,0.15)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--indigo)'
                          e.currentTarget.style.color = '#fff'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--indigo-soft)'
                          e.currentTarget.style.color = 'var(--indigo)'
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(99,102,241,0.15)'
                        }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'none' }}
                      >
                        <RotateCcw size={13} strokeWidth={2.5} />
                        Restore
                      </button>
                    </div>
                  </div>

                  {/* ROW 3 — chips (if any) */}
                  {chips.length > 0 && (
                    <>
                      <div style={{ borderTop: '1px solid var(--border-light)', margin: '0 0 10px' }} />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {chips.map((chip, i) => (
                          <span
                            key={`${chip}-${i}`}
                            className={CHIP_CLASSES[i % CHIP_CLASSES.length]}
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11, fontWeight: 600,
                              borderRadius: 8, padding: '4px 10px',
                            }}
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
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

          {/* Big stat card */}
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
            borderRadius: 16, padding: '24px 20px', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800, fontSize: 56, color: '#fff',
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {jobs.length}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.9)', fontWeight: 700,
              fontSize: 15, marginTop: 8,
            }}>
              Jobs Skipped
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

          {/* Hint card */}
          <div style={{
            background: 'var(--indigo-soft)',
            border: '1px solid var(--indigo-border)',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <RotateCcw size={18} strokeWidth={2} color="var(--indigo)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo)', marginBottom: 4 }}>
                Changed your mind?
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.5 }}>
                Click <strong>Restore</strong> on any card to move it back to your queue and apply later.
              </div>
            </div>
          </div>

          {/* Fit breakdown */}
          {jobs.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid var(--border-light)',
              padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div className="section-heading">Skipped by Fit</div>
              {[
                { label: 'Strong (80+)',   count: tierCounts.strong, tier: FIT_TIER.strong },
                { label: 'Good (65–79)',   count: tierCounts.good,   tier: FIT_TIER.good   },
                { label: 'Decent (45–64)', count: tierCounts.decent, tier: FIT_TIER.decent },
                { label: 'Weak (<45)',     count: tierCounts.weak,   tier: FIT_TIER.weak   },
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

          {/* Source breakdown */}
          {Object.keys(sourceCounts).length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid var(--border-light)',
              padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div className="section-heading">Skipped from</div>
              {Object.entries(sourceCounts).map(([src, count]) => {
                const srcStyle = SOURCE_STYLES[src] || { background: '#f0f2f8', color: 'var(--text-muted)' }
                const pct = Math.round((count / jobs.length) * 100)
                return (
                  <div key={src} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid var(--border-light)',
                  }}>
                    <span style={{
                      ...srcStyle, borderRadius: 999,
                      padding: '4px 12px', fontSize: 12, fontWeight: 700,
                      textTransform: 'capitalize', flexShrink: 0,
                    }}>
                      {src.charAt(0).toUpperCase() + src.slice(1)}
                    </span>
                    <div style={{
                      flex: 1, height: 5, background: 'var(--border-light)',
                      borderRadius: 999, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 999,
                        background: srcStyle.color,
                        width: `${pct}%`, opacity: 0.7,
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
        </div>
      </div>
    </div>
  )
}