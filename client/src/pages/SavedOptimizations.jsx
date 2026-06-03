import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedOptimizations } from '../lib/api'
import { Sparkles, BookmarkCheck, ExternalLink, Briefcase, MapPin, Calendar } from 'lucide-react'

const SOURCE_STYLES = {
  linkedin:      { background: '#e8f0fe', color: '#1d4ed8' },
  indeed:        { background: '#fff0e6', color: '#c2410c' },
  naukri:        { background: '#fef9e7', color: '#b45309' },
  remotive:      { background: '#f5f3ff', color: '#7c3aed' },
  google:        { background: '#fef9e7', color: '#b45309' },
  glassdoor:     { background: '#f0fdf4', color: '#15803d' },
}

const SECTION_COLORS = {
  summary:    { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
  experience: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  skills:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  projects:   { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
  others:     { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
}

function formatSavedDate(dateStr) {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Saved today'
    if (diffDays === 1) return 'Saved yesterday'
    if (diffDays < 7) return `Saved ${diffDays}d ago`
    return `Saved ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
  } catch { return null }
}

export default function SavedOptimizations() {
  const navigate = useNavigate()
  const [optimizations, setOptimizations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSavedOptimizations()
      .then(res => {
        setOptimizations(res.data.optimizations || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{
      height: 'calc(100vh - 72px)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-page)',
    }}>
      {/* ── PAGE HEADER ── */}
      <div style={{
        padding: '20px 28px 0',
        borderBottom: '1px solid var(--border-light)',
        background: '#fff',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}>
            <BookmarkCheck size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{
              fontWeight: 800, fontSize: 22, color: 'var(--text-dark)',
              margin: 0, lineHeight: 1.2,
            }}>
              Saved Optimizations
            </h1>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              Resume improvements you've saved for specific jobs
            </p>
          </div>
          {!loading && optimizations.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: 'var(--indigo-soft)', color: 'var(--indigo)',
              border: '1px solid var(--indigo-border)',
              borderRadius: 999, padding: '5px 14px',
              fontSize: 13, fontWeight: 700,
            }}>
              {optimizations.length} saved
            </span>
          )}
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* ── CONTENT ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 28px 32px',
      }}>
        {loading ? (
          /* Skeleton */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 16,
                border: '1px solid var(--border-light)',
                padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div className="skeleton-shimmer" style={{ height: 14, width: '50%', borderRadius: 6 }} />
                <div className="skeleton-shimmer" style={{ height: 20, width: '80%', borderRadius: 6 }} />
                <div className="skeleton-shimmer" style={{ height: 13, width: '40%', borderRadius: 6 }} />
                <div className="skeleton-shimmer" style={{ height: 32, width: '100%', borderRadius: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="skeleton-shimmer" style={{ height: 28, width: 80, borderRadius: 999 }} />
                  <div className="skeleton-shimmer" style={{ height: 28, width: 80, borderRadius: 999 }} />
                </div>
                <div className="skeleton-shimmer" style={{ height: 38, width: '100%', borderRadius: 10 }} />
              </div>
            ))}
          </div>
        ) : optimizations.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '60vh', gap: 16,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'var(--indigo-soft)', border: '2px solid var(--indigo-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={32} color="var(--indigo)" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-dark)', margin: '0 0 8px' }}>
                No saved optimizations yet
              </h2>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
                Use <strong>Tailor Resume</strong> on a job card and save the improvements to see them here.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '10px 24px', borderRadius: 10,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', fontWeight: 700, fontSize: 14,
                border: 'none', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                marginTop: 4,
              }}
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {optimizations.map((opt, index) => {
              const src = (opt.source || 'unknown').toLowerCase()
              const srcStyle = SOURCE_STYLES[src] || { background: '#f0f2f8', color: 'var(--text-muted)' }

              const sections = opt.sections
                ? Object.keys(opt.sections).filter(k => opt.sections[k]?.improved)
                : []
              const keywords = sections
                .flatMap(k => opt.sections[k]?.keywords_added || [])
                .slice(0, 6)
              const hasAts = opt.ats_score_before != null && opt.ats_score_after != null
              const atsDiff = hasAts ? (opt.ats_score_after - opt.ats_score_before) : 0

              return (
                <div
                  key={opt.id}
                  className="animate-slide-up"
                  style={{
                    animationDelay: `${index * 30}ms`,
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid var(--border-light)',
                    borderTop: '3px solid #6366f1',
                    padding: '20px 22px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', gap: 0,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                  onClick={() => navigate(`/tailor/${opt.id}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  {/* Top row — source badge + saved date */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        ...srcStyle, borderRadius: 999,
                        padding: '4px 11px', fontSize: 11, fontWeight: 700,
                        textTransform: 'capitalize',
                      }}>
                        {src.charAt(0).toUpperCase() + src.slice(1)}
                      </span>
                      <span style={{
                        background: 'var(--indigo-soft)', color: 'var(--indigo)',
                        borderRadius: 999, padding: '4px 10px',
                        fontSize: 11, fontWeight: 700,
                        border: '1px solid var(--indigo-border)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <BookmarkCheck size={10} strokeWidth={2.5} />
                        Optimized
                      </span>
                    </div>
                    {opt.saved_at && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
                      }}>
                        <Calendar size={10} strokeWidth={1.5} />
                        {formatSavedDate(opt.saved_at)}
                      </span>
                    )}
                  </div>

                  {/* Title + company */}
                  <h3 style={{
                    fontWeight: 800, fontSize: 16, color: 'var(--text-dark)',
                    lineHeight: 1.3, marginBottom: 6,
                  }}>
                    {opt.title || 'Untitled Position'}
                  </h3>
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--text-body)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    flexWrap: 'wrap', marginBottom: 14,
                  }}>
                    <Briefcase size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700 }}>{opt.company || 'Unknown Company'}</span>
                    {opt.location && (
                      <>
                        <span style={{ color: 'var(--text-disabled)' }}>·</span>
                        <MapPin size={11} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span>{opt.location}</span>
                      </>
                    )}
                  </p>

                  {/* ATS improvement */}
                  {hasAts && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#f0fdf4', border: '1px solid #bbf7d0',
                      borderRadius: 10, padding: '9px 14px', marginBottom: 12,
                    }}>
                      <Sparkles size={13} strokeWidth={2} color="#16a34a" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>ATS Score</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: '#94a3b8' }}>
                        {opt.ats_score_before}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>→</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: '#16a34a' }}>
                        {opt.ats_score_after}
                      </span>
                      {atsDiff > 0 && (
                        <span style={{
                          background: '#dcfce7', color: '#15803d',
                          borderRadius: 999, padding: '2px 9px',
                          fontSize: 12, fontWeight: 800,
                          border: '1px solid #bbf7d0',
                          marginLeft: 2,
                        }}>
                          +{atsDiff}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Sections chips */}
                  {sections.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {sections.map(sec => {
                        const c = SECTION_COLORS[sec] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
                        return (
                          <span key={sec} style={{
                            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                            borderRadius: 999, padding: '3px 10px',
                            fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                          }}>
                            {sec}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Keywords added */}
                  {keywords.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
                      {keywords.map((kw, i) => (
                        <span key={i} style={{
                          background: 'var(--indigo-soft)', color: 'var(--indigo)',
                          border: '1px solid var(--indigo-border)',
                          borderRadius: 999, padding: '2px 9px',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          +{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-light)', margin: '0 0 14px' }} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/tailor/${opt.id}`) }}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10,
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: '#fff', fontWeight: 700, fontSize: 13,
                        border: 'none', cursor: 'pointer',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
                    >
                      <Sparkles size={13} strokeWidth={2} />
                      View Suggestions
                    </button>
                    {opt.apply_url && (
                      <a
                        href={opt.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          padding: '9px 14px', borderRadius: 10,
                          background: 'var(--bg-soft)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', gap: 5,
                          textDecoration: 'none', fontWeight: 700, fontSize: 13,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-dark)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                      >
                        <ExternalLink size={13} strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
