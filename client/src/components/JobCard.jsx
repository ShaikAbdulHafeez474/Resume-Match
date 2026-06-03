import { useState } from 'react'
import { MapPin, Clock, Briefcase, CheckCircle2, Sparkles, SkipForward, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import { applyJob, skipJob, skipJobWithReason, scoreJob, getJobTailoring } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { safeStr, safeKeywords } from '../lib/sectionUtils'
import { ChatMarkdown } from './ChatBubble'

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
  strong: { grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', label: 'STRONG FIT', bg: '#eff6ff', border: '#06b6d4', light: '#e0f2fe' },
  good:   { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', label: 'GOOD FIT',   bg: '#f0fdf4', border: '#10b981', light: '#dcfce7' },
  decent: { grad: 'linear-gradient(135deg,#f59e0b,#f97316)', label: 'DECENT FIT', bg: '#fff7ed', border: '#f59e0b', light: '#fef3c7' },
  weak:   { grad: 'linear-gradient(135deg,#94a3b8,#64748b)', label: 'WEAK FIT',   bg: '#f8fafc', border: '#e2e8f0', light: '#f1f5f9' },
}

function getTier(score) {
  const s = parseInt(score) || 0
  if (s >= 80) return { key: 'strong', ...FIT_TIER.strong }
  if (s >= 65) return { key: 'good',   ...FIT_TIER.good   }
  if (s >= 45) return { key: 'decent', ...FIT_TIER.decent  }
  return           { key: 'weak',   ...FIT_TIER.weak   }
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
  } catch { return dateStr }
}

const SECTION_COLORS = {
  summary:    { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
  experience: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  skills:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  projects:   { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
  others:     { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
}

export default function JobCard({ job, onRemove, index = 0, isManual = false, isSelected = false, onSelect }) {
  const navigate = useNavigate()
  const [dismissing, setDismissing]         = useState(false)
  const [scoring, setScoring]               = useState(false)
  const [localScore, setLocalScore]         = useState(null)
  const [savedSummary, setSavedSummary]     = useState(null)
  const [showSummary, setShowSummary]       = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [showSkipModal, setShowSkipModal]   = useState(false)
  const [skipReason, setSkipReason]         = useState('')

  const title    = job.title    || 'Untitled Position'
  const company  = job.company  || 'Unknown Company'
  const location = job.location || 'Location not specified'
  const source   = (job.source  || 'unknown').toLowerCase()

  const currentScore = localScore ?? job.fit_score
  const tier = getTier(currentScore)
  const isStrong = tier.key === 'strong'
  const srcStyle = SOURCE_STYLES[source] || { background: '#f0f2f8', color: 'var(--text-muted)' }

  const skills = Array.isArray(job.match_skills)
    ? job.match_skills
    : typeof job.match_skills === 'string'
      ? job.match_skills.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean)
      : []
  const highlights = (job.fit_highlights || '').split(',').map(s => s.trim()).filter(Boolean)
  const chips = skills.length > 0 ? skills : highlights

  const handleOpenJob = () => {
    if (job.apply_url) window.open(job.apply_url, '_blank', 'noopener,noreferrer')
    else toast.error('No apply link available')
  }

  const handleMarkApplied = async (e) => {
    e.stopPropagation()
    setDismissing(true)
    try {
      await applyJob(job.id)
      toast.success(`✓ Applied to ${title} at ${company}`)
      setTimeout(() => onRemove(job.id), 200)
    } catch {
      toast.error('Failed to mark as applied')
      setDismissing(false)
    }
  }

  const handleSkip = async (e) => {
    e.stopPropagation()
    setShowSkipModal(true)
  }

  const handleConfirmSkip = async () => {
    setDismissing(true)
    setShowSkipModal(false)
    try {
      await skipJobWithReason(job.id, skipReason)
      toast(`Skipped ${title}`)
      setTimeout(() => onRemove(job.id), 200)
    } catch {
      toast.error('Failed to skip')
      setDismissing(false)
    }
  }

  const handleGetScore = async (e) => {
    e.stopPropagation()
    setScoring(true)
    try {
      const res = await scoreJob(job.id)
      setLocalScore(res.data.fit_score)
      toast.success(`Score: ${res.data.fit_score}/100`)
    } catch {
      toast.error('Failed to score')
    } finally {
      setScoring(false)
    }
  }

  const handleViewSummary = async (e) => {
    e.stopPropagation()
    if (showSummary) { setShowSummary(false); return }
    if (savedSummary) { setShowSummary(true); return }
    setLoadingSummary(true)
    try {
      const res = await getJobTailoring(job.id)
      if (res.data.tailoring) {
        setSavedSummary(res.data.tailoring)
        setShowSummary(true)
      } else {
        toast('No saved summary yet. Click "Tailor Resume" first.')
      }
    } catch {
      toast.error('Failed to load summary')
    } finally {
      setLoadingSummary(false)
    }
  }

  return (
    <div
      onClick={() => onSelect && onSelect(job)}
      style={{
        width: '100%',
        background: '#fff',
        border: isSelected
          ? `2px solid #6366f1`
          : isStrong
            ? `1px solid ${tier.border}44`
            : '1px solid var(--border-light)',
        borderLeft: isSelected
          ? '4px solid #6366f1'
          : isStrong
            ? `4px solid ${tier.border}`
            : '1px solid var(--border-light)',
        borderRadius: 16,
        boxShadow: isSelected
          ? '0 4px 16px rgba(99,102,241,0.15)'
          : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.15s',
        opacity: dismissing ? 0 : 1,
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'none'
        }
      }}
    >
      <div style={{ padding: '14px 16px' }}>

        {/* ROW 1 — badges + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...srcStyle, borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
              {source.charAt(0).toUpperCase() + source.slice(1)}
            </span>
            {job.is_remote && (
              <span style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, border: '1px solid var(--indigo-border)' }}>Remote</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            {job.posted_at && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>
                <Clock size={10} strokeWidth={1.5} />{formatDate(job.posted_at)}
              </span>
            )}
            {isStrong && !isManual && (
              <span style={{ background: FIT_TIER.strong.grad, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                ⚡ TOP MATCH
              </span>
            )}
          </div>
        </div>

        {/* ROW 2 — title + score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-dark)', lineHeight: 1.3, marginBottom: 5 }}>{title}</h3>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', margin: 0 }}>
              <Briefcase size={11} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontWeight: 700 }}>{company}</span>
              <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>·</span>
              <MapPin size={11} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span>{location}</span>
            </p>
          </div>

          {isManual && localScore === null ? (
            <button onClick={handleGetScore} disabled={scoring} style={{
              padding: '6px 12px', borderRadius: 9, flexShrink: 0,
              background: scoring ? 'var(--border-light)' : 'var(--indigo-soft)',
              border: '1px solid var(--indigo-border)',
              color: scoring ? 'var(--text-muted)' : 'var(--indigo)',
              fontWeight: 700, fontSize: 11,
              cursor: scoring ? 'not-allowed' : 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}>
              {scoring
                ? <><div style={{ width: 11, height: 11, border: '2px solid var(--indigo)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Scoring...</>
                : <><Sparkles size={11} strokeWidth={2} />Get Score</>}
            </button>
          ) : (
            <div style={{ background: tier.bg, borderRadius: 10, padding: '7px 12px', textAlign: 'center', flexShrink: 0, border: `1px solid ${tier.border}33`, minWidth: 62 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 26, lineHeight: 1, background: tier.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {parseInt(currentScore) || 0}
              </div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap' }}>{tier.label}</div>
            </div>
          )}
        </div>

        {/* ROW 3 — skill chips */}
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            {chips.slice(0, 3).map((chip, i) => (
              <span key={`${chip}-${i}`} className={CHIP_CLASSES[i % CHIP_CLASSES.length]}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, borderRadius: 7, padding: '3px 9px' }}>
                {chip}
              </span>
            ))}
            {chips.length > 3 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-soft)', border: '1px solid var(--border-light)', borderRadius: 7, padding: '3px 9px' }}>
                +{chips.length - 3} more
              </span>
            )}
            {job.salary_display && (
              <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--green-soft)', color: '#15803d', border: '1px solid var(--green-border)', borderRadius: 7, padding: '3px 9px', marginLeft: 'auto' }}>
                💰 {job.salary_display}
              </span>
            )}
          </div>
        )}

        {/* DIVIDER */}
        <div style={{ borderTop: '1px solid var(--border-light)', margin: '0 0 10px' }} />

        {/* ROW 4 — action buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); handleSkip(e) }}
            style={{
              padding: '7px 13px', borderRadius: 8,
              background: 'none', border: '1px solid var(--border-medium)',
              color: 'var(--text-muted)', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 5,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = 'var(--text-dark)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <SkipForward size={11} strokeWidth={2} /> Skip
          </button>

          <button
            onClick={e => { e.stopPropagation(); navigate(`/tailor/${job.id}`) }}
            style={{
              padding: '7px 13px', borderRadius: 8,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 12,
              border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: '0 2px 8px rgba(99,102,241,0.28)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
          >
            <Sparkles size={11} strokeWidth={2} /> Tailor Resume
          </button>

          <button
            onClick={e => { e.stopPropagation(); handleViewSummary(e) }}
            disabled={loadingSummary}
            style={{
              padding: '7px 13px', borderRadius: 8,
              background: showSummary ? 'var(--indigo-soft)' : 'var(--bg-soft)',
              border: `1px solid ${showSummary ? 'var(--indigo-border)' : 'var(--border-medium)'}`,
              color: showSummary ? 'var(--indigo)' : 'var(--text-muted)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {loadingSummary
              ? <><div style={{ width: 10, height: 10, border: '2px solid var(--indigo)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />...</>
              : <>
                  <FileText size={11} strokeWidth={2} />
                  {showSummary ? 'Hide' : 'Summary'}
                  {job.has_tailoring && !showSummary && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
                  )}
                </>}
          </button>

          <button
            onClick={handleMarkApplied}
            style={{
              padding: '7px 13px', borderRadius: 8,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff', fontWeight: 700, fontSize: 12,
              border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: '0 2px 8px rgba(16,185,129,0.28)',
              marginLeft: 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
          >
            <CheckCircle2 size={11} strokeWidth={2.5} /> Mark Applied
          </button>
        </div>
      </div>

      {/* ── SAVED SUMMARY PANEL ── */}
      {showSummary && savedSummary && (
        <div style={{ borderTop: '2px solid var(--indigo-border)', background: '#fafbff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Sparkles size={14} strokeWidth={2} color="var(--indigo)" />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>Saved Resume Improvements</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>
              ATS: <span style={{ color: '#94a3b8' }}>{savedSummary.ats_score_before}</span>
              {' → '}
              <span style={{ color: '#10b981', fontWeight: 800 }}>{savedSummary.ats_score_after}</span>
              {savedSummary.ats_score_after > savedSummary.ats_score_before && (
                <span style={{ color: '#10b981' }}> (+{savedSummary.ats_score_after - savedSummary.ats_score_before})</span>
              )}
            </span>
          </div>

          {savedSummary.sections && Object.entries(savedSummary.sections).map(([key, data]) => {
            if (!data?.improved) return null
            const c = SECTION_COLORS[key] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
            return (
              <div key={key} style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: c.bg, borderBottom: `1px solid ${c.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{key}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {safeKeywords(data.keywords_added).slice(0, 3).map((kw, i) => (
                      <span key={i} style={{ background: '#fff', color: c.color, border: `1px solid ${c.border}`, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>+{kw}</span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  <ChatMarkdown content={safeStr(data.improved)} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── SKIP REASON MODAL ── */}
      {showSkipModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowSkipModal(false); setSkipReason('') } }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            {/* Header row with X */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-dark)', margin: '0 0 4px' }}>Why are you skipping this job?</h3>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>{title} · {company}</p>
              </div>
              <button onClick={() => { setShowSkipModal(false); setSkipReason('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', marginTop: -2 }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            {/* Radio list */}
            <div style={{ margin: '12px 0' }}>
              {['Not Relevant', 'Low ATS Score', 'Wrong Tech Stack', 'Wrong Location', 'Already Applied Elsewhere', 'Other'].map(reason => (
                <div
                  key={reason}
                  onClick={() => setSkipReason(reason)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${skipReason === reason ? 'var(--indigo)' : 'var(--border-medium)'}`,
                    background: skipReason === reason ? 'var(--indigo)' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {skipReason === reason && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: skipReason === reason ? 700 : 500, color: skipReason === reason ? 'var(--indigo)' : 'var(--text-body)' }}>
                    {reason}
                  </span>
                </div>
              ))}
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button onClick={handleConfirmSkip} disabled={!skipReason} style={{ padding: '10px 24px', borderRadius: 10, background: skipReason ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--border-light)', color: skipReason ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: 13, border: 'none', cursor: skipReason ? 'pointer' : 'not-allowed', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: skipReason ? '0 4px 12px rgba(99,102,241,0.3)' : 'none' }}>
                Skip Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
