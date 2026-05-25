import { useState } from 'react'
import { MapPin, Clock, ExternalLink, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { applyJob, skipJob } from '../lib/api'

const SOURCE_STYLES = {
  linkedin:      { background: '#e8f0fe', color: '#1d4ed8' },
  indeed:        { background: '#fff0e6', color: '#c2410c' },
  naukri:        { background: '#fef9e7', color: '#b45309' },
  remotive:      { background: '#f5f3ff', color: '#7c3aed' },
  google:        { background: '#fef9e7', color: '#b45309' },
  zip_recruiter: { background: '#eff6ff', color: '#1d4ed8' },
  glassdoor:     { background: '#f0fdf4', color: '#15803d' },
}

const FIT_TIER = {
  strong: { grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', label: 'STRONG FIT', bg: '#eff6ff', border: '#06b6d4' },
  good:   { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', label: 'GOOD FIT',   bg: '#f0fdf4', border: '#10b981' },
  decent: { grad: 'linear-gradient(135deg,#f59e0b,#f97316)', label: 'DECENT FIT', bg: '#fff7ed', border: '#f59e0b' },
  weak:   { grad: 'linear-gradient(135deg,#94a3b8,#64748b)', label: 'WEAK FIT',   bg: '#f8fafc', border: '#e2e8f0' },
}

function getTier(score) {
  const s = parseInt(score) || 0
  if (s >= 80) return { key: 'strong', ...FIT_TIER.strong }
  if (s >= 65) return { key: 'good',   ...FIT_TIER.good }
  if (s >= 45) return { key: 'decent', ...FIT_TIER.decent }
  return           { key: 'weak',   ...FIT_TIER.weak }
}

const CHIP_CLASSES = ['chip-0','chip-1','chip-2','chip-3','chip-4']

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

export default function JobCard({ job, onRemove, index = 0, isManual = false }) {
  const [dismissing, setDismissing] = useState(false)

  const title    = job.title    || 'Untitled Position'
  const company  = job.company  || 'Unknown Company'
  const location = job.location || 'Location not specified'
  const source   = (job.source  || 'unknown').toLowerCase()

  const { key: tierKey, grad: fitGrad, label: fitLabel, bg: scoreBg, border: tierBorder } = getTier(job.fit_score)
  const isStrong = tierKey === 'strong'

  const srcStyle = SOURCE_STYLES[source] || { background: '#f0f2f8', color: 'var(--text-muted)' }

  const fitReason = (!job.fit_reason || job.fit_reason === 'Could not score automatically.')
    ? 'Review this job manually.'
    : job.fit_reason

  const skills = Array.isArray(job.match_skills)
    ? job.match_skills
    : typeof job.match_skills === 'string'
      ? job.match_skills.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean)
      : []

  const highlights = (job.fit_highlights || '')
    .split(',').map(s => s.trim()).filter(Boolean)

  const chips = skills.length > 0 ? skills : highlights

  const handleApply = async () => {
    setDismissing(true)
    try {
      await applyJob(job.id)
      toast.success(`Applied to ${title} at ${company}`)
      setTimeout(() => onRemove(job.id), 200)
    } catch {
      toast.error('Failed to mark as applied')
      setDismissing(false)
    }
  }

  const handleSkip = async () => {
    setDismissing(true)
    try {
      await skipJob(job.id)
      toast(`Skipped ${title}`)
      setTimeout(() => onRemove(job.id), 200)
    } catch {
      toast.error('Failed to skip')
      setDismissing(false)
    }
  }

  const handleApplyClick = () => {
    if (job.apply_url) window.open(job.apply_url, '_blank', 'noopener,noreferrer')
    handleApply()
  }

  return (
    <div
      className={`animate-slide-up ${dismissing ? 'animate-dismiss' : ''}`}
      style={{
        animationDelay: `${index * 40}ms`,
        width: '100%',
        background: '#fff',
        border: `1px solid var(--border-light)`,
        borderLeft: isStrong ? `4px solid ${tierBorder}` : `1px solid var(--border-light)`,
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.04), 0 10px 20px rgba(0,0,0,0.08)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
        e.currentTarget.style.transform = 'none'
      }}
    >

      {/* ── ROW 1 — badges LEFT, date + TOP MATCH RIGHT ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14,
      }}>
        {/* Left: source + remote + job type badges */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            ...srcStyle,
            borderRadius: 999, padding: '5px 13px',
            fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
          }}>
            {source.charAt(0).toUpperCase() + source.slice(1)}
          </span>
          {job.is_remote && (
            <span style={{
              background: 'var(--indigo-soft)', color: 'var(--indigo)',
              borderRadius: 999, padding: '5px 13px',
              fontSize: 12, fontWeight: 700, border: '1px solid var(--indigo-border)',
            }}>
              Remote
            </span>
          )}
          {job.job_type && (
            <span style={{
              background: 'var(--bg-soft)', color: 'var(--text-muted)',
              borderRadius: 999, padding: '5px 13px',
              fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border-light)',
            }}>
              {job.job_type}
            </span>
          )}
        </div>

        {/* Right: date + TOP MATCH badge side by side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {job.posted_at && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--text-muted)', fontSize: 12, fontWeight: 500,
            }}>
              <Clock size={11} strokeWidth={1.5} />
              {formatDate(job.posted_at)}
            </span>
          )}
          {/* TOP MATCH badge — moved here, inline with date */}
          {isStrong && !isManual && (
            <span style={{
              background: FIT_TIER.strong.grad,
              color: '#fff',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              padding: '5px 12px', borderRadius: 999,
              whiteSpace: 'nowrap',
            }}>
              ⚡ TOP MATCH
            </span>
          )}
        </div>
      </div>

      {/* ── ROW 2 — title + company LEFT, score RIGHT ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14, gap: 16,
      }}>
        {/* Job info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontWeight: 800, fontSize: 18, color: 'var(--text-dark)',
            lineHeight: 1.25, marginBottom: 6,
          }}>
            {title}
          </h3>
          <p style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text-body)',
            display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
          }}>
            <Briefcase size={13} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontWeight: 700 }}>{company}</span>
            <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>·</span>
            <MapPin size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span>{location}</span>
          </p>
        </div>

        {/* Score block */}
        {isManual ? (
          <div style={{
            background: '#f8fafc', borderRadius: 14, padding: '10px 16px',
            textAlign: 'center', flexShrink: 0, border: '1px solid var(--border-light)',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, fontSize: 30, lineHeight: 1,
              color: 'var(--text-disabled)',
            }}>—</div>
          </div>
        ) : (
          <div style={{
            background: scoreBg, borderRadius: 14,
            padding: '10px 16px', textAlign: 'center', flexShrink: 0,
            border: `1px solid ${tierBorder}22`,
            minWidth: 80,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800, fontSize: 36, lineHeight: 1,
              background: fitGrad,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {parseInt(job.fit_score) || 0}
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'var(--text-muted)', marginTop: 3,
              whiteSpace: 'nowrap',
            }}>
              {fitLabel}
            </div>
          </div>
        )}
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: '1px solid var(--border-light)', margin: '0 0 14px' }} />

      {/* ── ROW 3 — fit reason (resume mode only) ── */}
      {!isManual && (
        <div style={{
          background: 'var(--indigo-soft)',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 14,
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

      {/* ── ROW 4 — skill chips + salary ── */}
      {(!isManual && chips.length > 0) || job.salary_display ? (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16,
          flexWrap: 'wrap', gap: 8,
        }}>
          {!isManual && chips.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {chips.slice(0, 5).map((chip, i) => (
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
            </div>
          )}
          {job.salary_display && (
            <span style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text-dark)',
              flexShrink: 0, marginLeft: 'auto',
              background: 'var(--green-soft)', color: '#15803d',
              border: '1px solid var(--green-border)',
              borderRadius: 8, padding: '5px 12px',
            }}>
              💰 {job.salary_display}
            </span>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 16 }} />
      )}

      {/* ── ROW 5 — action buttons ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: 8,
        paddingTop: 4,
        borderTop: '1px solid var(--border-light)',
      }}>
        {/* Left side — job meta */}
        <span style={{
          fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {job.apply_url
            ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>● Apply link available</span>
            : <span style={{ color: 'var(--text-disabled)' }}>○ No direct link</span>
          }
        </span>

        {/* Right side — buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSkip}
            style={{
              padding: '9px 22px', borderRadius: 10,
              background: '#fff', border: '1px solid var(--border-medium)',
              color: 'var(--text-muted)', fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f8fafc'
              e.currentTarget.style.color = 'var(--text-dark)'
              e.currentTarget.style.borderColor = 'var(--border-strong, #a0aabf)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'var(--border-medium)'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'none' }}
          >
            Skip
          </button>
          <button
            onClick={handleApplyClick}
            disabled={!job.apply_url}
            style={{
              padding: '9px 26px', borderRadius: 10,
              background: job.apply_url
                ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                : 'var(--border-light)',
              color: job.apply_url ? '#fff' : 'var(--text-disabled)',
              fontWeight: 700, fontSize: 14,
              border: 'none',
              cursor: job.apply_url ? 'pointer' : 'not-allowed',
              boxShadow: job.apply_url ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 7,
            }}
            onMouseEnter={e => {
              if (!job.apply_url) return
              e.currentTarget.style.transform = 'scale(1.02)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = job.apply_url ? '0 4px 14px rgba(99,102,241,0.35)' : 'none'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
          >
            {job.apply_url ? (
              <><ExternalLink size={14} strokeWidth={2.5} /> Apply Now</>
            ) : (
              'No Link'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}