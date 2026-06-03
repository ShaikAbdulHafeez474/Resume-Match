import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAppliedJobs, getSkippedJobs, unskipJob, getStats } from '../lib/api'
import StatBar from '../components/StatBar'
import EmptyState from '../components/EmptyState'
import { MapPin, ExternalLink, Briefcase, Clock, TrendingUp, Building2, CheckCircle2, Sparkles, X, ArrowRight, RotateCcw } from 'lucide-react'

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
  const navigate = useNavigate()
  const [jobs, setJobs]         = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [optimizationJob, setOptimizationJob] = useState(null)
  const [skippedJobs, setSkippedJobs] = useState([])

  useEffect(() => {
    Promise.all([getAppliedJobs(), getStats(), getSkippedJobs()])
      .then(([j, s, sk]) => {
        setJobs(j.data.jobs || [])
        setStats(s.data)
        setSkippedJobs(sk.data.jobs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 72px)', overflow: 'hidden',
    }}>
      <StatBar stats={stats} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT COLUMN — Applied job cards ── */}
        <div style={{
          flex: 1, maxWidth: 720, overflowY: 'auto',
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

              // Tailoring data
              const hasTailoring = job.ats_score_before != null && job.ats_score_after != null
              const tailoredSections = job.tailoring_sections
                ? Object.keys(job.tailoring_sections).filter(k => job.tailoring_sections[k]?.improved)
                : []
              const keywordsAdded = tailoredSections
                .flatMap(k => job.tailoring_sections[k]?.keywords_added || [])
                .slice(0, 4)
              const atsDiff = hasTailoring ? (job.ats_score_after - job.ats_score_before) : 0

              const SECTION_COLORS = {
                summary:    { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
                experience: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
                skills:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                projects:   { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
              }

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

                  {/* Resume Version Used label */}
                  {hasTailoring && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Resume Version Used
                    </div>
                  )}

                  {/* ATS improvement row — only when tailoring exists */}
                  {hasTailoring && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#f0fdf4', border: '1px solid #bbf7d0',
                      borderRadius: 10, padding: '8px 14px', marginBottom: 12,
                      flexWrap: 'wrap',
                    }}>
                      <Sparkles size={13} strokeWidth={2} color="#16a34a" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>ATS Score:</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: '#94a3b8' }}>
                        {job.ats_score_before}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: 14 }}>→</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: '#16a34a' }}>
                        {job.ats_score_after}
                      </span>
                      {atsDiff > 0 && (
                        <span style={{
                          background: '#dcfce7', color: '#15803d',
                          borderRadius: 999, padding: '2px 9px',
                          fontSize: 12, fontWeight: 800,
                          border: '1px solid #bbf7d0',
                        }}>
                          +{atsDiff}
                        </span>
                      )}
                      {tailoredSections.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginLeft: 4 }}>
                          {tailoredSections.map(sec => {
                            const c = SECTION_COLORS[sec] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
                            return (
                              <span key={sec} style={{
                                background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                                borderRadius: 999, padding: '2px 9px',
                                fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                              }}>{sec}</span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Keywords added row */}
                  {keywordsAdded.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Keywords added:</span>
                      {keywordsAdded.map((kw, i) => (
                        <span key={i} style={{
                          background: 'var(--indigo-soft)', color: 'var(--indigo)',
                          border: '1px solid var(--indigo-border)',
                          borderRadius: 999, padding: '2px 9px',
                          fontSize: 11, fontWeight: 700,
                        }}>+{kw}</span>
                      ))}
                    </div>
                  )}

                  {/* Fit reason */}
                  {fitReason && !hasTailoring && (
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

                  {/* DIVIDER */}
                  <div style={{ borderTop: '1px solid var(--border-light)', margin: '0 0 12px' }} />

                  {/* ROW — chips + buttons */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexWrap: 'wrap', gap: 8,
                  }}>
                    {/* Chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {chips.slice(0, 3).map((chip, i) => (
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

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {hasTailoring && (
                        <button
                          onClick={() => setOptimizationJob(job)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 13, fontWeight: 700,
                            color: 'var(--indigo)',
                            background: 'var(--indigo-soft)',
                            border: '1px solid var(--indigo-border)',
                            borderRadius: 10, padding: '7px 14px',
                            cursor: 'pointer',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--indigo)'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--indigo-soft)'; e.currentTarget.style.color = 'var(--indigo)' }}
                        >
                          <Sparkles size={13} strokeWidth={2} />
                          View Optimization
                        </button>
                      )}
                      {job.apply_url && (
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 13, fontWeight: 700,
                            color: 'var(--text-muted)', textDecoration: 'none',
                            background: 'var(--bg-soft)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: 10, padding: '7px 14px',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-dark)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        >
                          <ExternalLink size={13} strokeWidth={2} />
                          View Job
                        </a>
                      )}
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 700,
                        background: 'var(--green-soft)', color: '#15803d',
                        border: '1px solid var(--green-border)',
                        borderRadius: 10, padding: '7px 14px',
                      }}>
                        <CheckCircle2 size={12} strokeWidth={2.5} />
                        Applied
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderLeft: '1px solid var(--border-light)', background: '#fff', overflowY: 'auto', padding: '16px 0' }}>

          {/* Applied Jobs section */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>Applied Jobs</span>
                <span style={{ background: 'var(--green-soft)', color: '#15803d', border: '1px solid var(--green-border)', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>{jobs.length}</span>
              </div>
              <a href="/applied" style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', textDecoration: 'none' }}>View All →</a>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, padding: '6px 8px', background: 'var(--bg-soft)', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>ATS</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Applied</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}></span>
            </div>

            {jobs.slice(0, 8).map(job => {
              const hasTail = job.ats_score_before != null && job.ats_score_after != null
              const diff = hasTail ? job.ats_score_after - job.ats_score_before : 0
              return (
                <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', padding: '8px 8px', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{job.company}</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    {hasTail ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: '#94a3b8' }}>{job.ats_score_before}</span>
                        <span style={{ color: '#94a3b8', margin: '0 2px' }}>→</span>
                        <span style={{ color: '#16a34a' }}>{job.ats_score_after}</span>
                        {diff > 0 && <span style={{ color: '#16a34a' }}> +{diff}</span>}
                      </span>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>—</span>}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {job.applied_at ? new Date(job.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </div>
                  <div>
                    {job.apply_url && (
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'flex' }}>
                        <ExternalLink size={13} strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
            {jobs.length === 0 && !loading && <div style={{ padding: '16px 8px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No applied jobs yet</div>}
          </div>

          <div style={{ height: 1, background: 'var(--border-light)', margin: '0 16px 16px' }} />

          {/* Skipped Jobs section */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>Skipped Jobs</span>
                <span style={{ background: 'var(--orange-soft)', color: 'var(--orange)', border: '1px solid var(--orange-border)', borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>{skippedJobs.length}</span>
              </div>
              <a href="/skipped" style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo)', textDecoration: 'none' }}>View All →</a>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, padding: '6px 8px', background: 'var(--bg-soft)', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reason</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Skipped</span>
              <span></span>
            </div>

            {skippedJobs.slice(0, 8).map(job => (
              <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', padding: '8px 8px', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{job.company}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--orange)', whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {job.skip_reason || '—'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {job.fetched_at ? new Date(job.fetched_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                </div>
                <div>
                  <button onClick={() => { unskipJob(job.id).then(() => setSkippedJobs(prev => prev.filter(j => j.id !== job.id))).catch(() => {}) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}>
                    <RotateCcw size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
            {skippedJobs.length === 0 && <div style={{ padding: '16px 8px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No skipped jobs</div>}
          </div>
        </div>
      </div>

      {/* ── OPTIMIZATION DRAWER MODAL ── */}
      {optimizationJob && (() => {
        const oj = optimizationJob
        const sections = oj.tailoring_sections
          ? Object.keys(oj.tailoring_sections).filter(k => oj.tailoring_sections[k]?.improved)
          : []
        const allKeywords = sections.flatMap(k => oj.tailoring_sections[k]?.keywords_added || [])
        const diff = (oj.ats_score_after || 0) - (oj.ats_score_before || 0)
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) setOptimizationJob(null) }}
          >
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)' }}>Applied Resume Optimization</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>{oj.title} · {oj.company}</div>
                </div>
                <button onClick={() => setOptimizationJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
              {/* Scrollable content */}
              <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* ATS card */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>ATS Improvement</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 800, color: '#94a3b8' }}>{oj.ats_score_before}</span>
                    <span style={{ fontSize: 20, color: '#94a3b8' }}>→</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 800, color: '#16a34a' }}>{oj.ats_score_after}</span>
                    {diff > 0 && (
                      <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 800, border: '1px solid #bbf7d0' }}>+{diff} Points Improvement</span>
                    )}
                  </div>
                </div>
                {/* Two columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Modified sections */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 10 }}>Modified Sections</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {sections.length > 0 ? sections.map(sec => (
                        <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle2 size={11} strokeWidth={2.5} color="#16a34a" />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', textTransform: 'capitalize' }}>{sec} Customized</span>
                        </div>
                      )) : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No sections saved yet</span>}
                    </div>
                  </div>
                  {/* Keywords */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 10 }}>Keywords Added</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {allKeywords.slice(0, 6).map((kw, i) => (
                        <span key={i} style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{kw}</span>
                      ))}
                      {allKeywords.length > 6 && (
                        <span style={{ background: 'var(--bg-soft)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>+{allKeywords.length - 6} more</span>
                      )}
                      {allKeywords.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>None saved</span>}
                    </div>
                  </div>
                </div>
                {/* Footer */}
                {oj.tailored_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Saved On</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-body)' }}>
                      {new Date(oj.tailored_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {/* CTA */}
                <button
                  onClick={() => { setOptimizationJob(null); navigate(`/tailor/${oj.id}`) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
                >
                  View Full Suggestions <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}