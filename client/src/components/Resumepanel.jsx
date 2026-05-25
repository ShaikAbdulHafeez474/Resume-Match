import { Upload, Zap, Target, CheckCircle2, SkipForward } from 'lucide-react'

const FIT_TIER = {
  strong: { grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', dot: '#06b6d4' },
  good:   { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', dot: '#10b981' },
  decent: { grad: 'linear-gradient(135deg,#f59e0b,#f97316)', dot: '#f59e0b' },
  weak:   { grad: 'linear-gradient(135deg,#94a3b8,#64748b)', dot: '#94a3b8' },
}

const SOURCE_STYLES = {
  linkedin:  { background: '#e8f0fe', color: '#1d4ed8' },
  indeed:    { background: '#fff0e6', color: '#c2410c' },
  naukri:    { background: '#fef9e7', color: '#b45309' },
  remotive:  { background: '#f5f3ff', color: '#7c3aed' },
  google:    { background: '#fef9e7', color: '#b45309' },
  glassdoor: { background: '#f0fdf4', color: '#15803d' },
}

const CHIP_COLORS = [
  { bg: 'var(--pink-soft)',   color: 'var(--pink)',   border: 'var(--pink-border)'   },
  { bg: 'var(--blue-soft)',   color: 'var(--blue)',   border: 'var(--blue-border)'   },
  { bg: 'var(--green-soft)',  color: 'var(--green)',  border: 'var(--green-border)'  },
  { bg: 'var(--orange-soft)', color: 'var(--orange)', border: 'var(--orange-border)' },
  { bg: 'var(--purple-soft)', color: 'var(--purple)', border: 'var(--purple-border)' },
]

export default function ResumePanel({ resume, stats, onUploadClick, onFetchClick, userName }) {
  const analysis = resume?.analysis || null
  const skills = analysis?.core_skills || analysis?.frameworks_tools || []
  const targetRoles = analysis?.target_roles || []
  const initials = (analysis?.name || userName || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{
      width: 420,
      flexShrink: 0,
      borderLeft: '1px solid var(--border-light)',
      background: '#fff',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      // Fixed height so it doesn't push content outside
      height: 'calc(100vh - 180px)',
      alignSelf: 'flex-start',
      position: 'sticky',
      top: 0,
    }}>

      {/* ── CARD 1 — Resume Profile ── */}
      {analysis ? (
        <div style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid var(--border-light)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          // Remove overflow:hidden — it was clipping the gradient header
          flexShrink: 0,
        }}>
          {/* Gradient header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            padding: '20px 20px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            borderRadius: '16px 16px 0 0',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800, fontSize: 18, color: '#fff',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 17, fontWeight: 800, color: '#fff',
                lineHeight: 1.2, marginBottom: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {analysis.name || userName || 'Your Profile'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>
                {analysis.current_title || 'Professional'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {analysis.experience_level && (
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: '#fff',
                    borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                  }}>
                    {analysis.experience_level}
                  </span>
                )}
                {analysis.years_of_experience !== undefined && (
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: '#fff',
                    borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                  }}>
                    {analysis.years_of_experience}y exp
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
            borderRadius: '0 0 16px 16px',
          }}>
            {analysis.summary && (
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.65, margin: 0 }}>
                {analysis.summary}
              </p>
            )}

            {skills.length > 0 && (
              <div>
                <div className="section-heading" style={{ marginBottom: 8 }}>Core Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {skills.slice(0, 10).map((skill, i) => {
                    const c = CHIP_COLORS[i % CHIP_COLORS.length]
                    return (
                      <span key={skill} style={{
                        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                        borderRadius: 8, padding: '4px 10px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {skill}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {targetRoles.length > 0 && (
              <div>
                <div className="section-heading" style={{ marginBottom: 8 }}>Target Roles</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {targetRoles.slice(0, 4).map(role => (
                    <span key={role} style={{
                      background: 'var(--indigo-soft)', color: 'var(--indigo)',
                      border: '1px solid var(--indigo-border)',
                      borderRadius: 8, padding: '4px 10px',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onUploadClick}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                width: '100%', padding: '9px 0', borderRadius: 10,
                background: 'var(--bg-soft)', border: '1px solid var(--border-medium)',
                color: 'var(--text-body)', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--indigo-soft)'
                e.currentTarget.style.color = 'var(--indigo)'
                e.currentTarget.style.borderColor = 'var(--indigo-border)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-soft)'
                e.currentTarget.style.color = 'var(--text-body)'
                e.currentTarget.style.borderColor = 'var(--border-medium)'
              }}
            >
              <Upload size={14} strokeWidth={2.5} /> Update Resume
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--indigo-soft)', border: '2px dashed var(--indigo-border)',
          borderRadius: 16, padding: '24px 20px', textAlign: 'center', flexShrink: 0,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
            background: 'var(--indigo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Upload size={22} strokeWidth={2} color="#fff" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 6 }}>
            No resume yet
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Upload your resume to get AI-powered job matching with fit scores
          </p>
          <button
            onClick={onUploadClick}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 22px', borderRadius: 10,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 14, border: 'none',
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            <Upload size={15} strokeWidth={2.5} /> Upload Resume
          </button>
        </div>
      )}

      {/* ── CARD 2 — Match Breakdown ── */}
      {stats && (
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid var(--border-light)',
          padding: '14px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>
          <div className="section-heading" style={{ marginBottom: 12 }}>Match Breakdown</div>
          {[
            { label: 'Strong Fit (80+)', value: stats.strong_fit || 0, tier: FIT_TIER.strong },
            { label: 'Good Fit (65–79)', value: stats.good_fit   || 0, tier: FIT_TIER.good   },
            { label: 'Decent (45–64)',   value: Math.max(0, (stats.total || 0) - (stats.strong_fit || 0) - (stats.good_fit || 0) - (stats.weak_fit || 0)), tier: FIT_TIER.decent },
            { label: 'Weak Fit (<45)',   value: stats.weak_fit   || 0, tier: FIT_TIER.weak   },
          ].map(({ label, value, tier }) => {
            const total = stats.total || 1
            const pct = Math.round((value / total) * 100)
            return (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: tier.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800,
                    background: tier.grad,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                    {value}
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: tier.dot, borderRadius: 999, width: `${pct}%`, opacity: 0.8 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CARD 3 — Sources ── */}
      {stats?.sources && stats.sources.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid var(--border-light)',
          padding: '14px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>
          <div className="section-heading" style={{ marginBottom: 10 }}>Sources</div>
          {stats.sources.map(({ source, count }) => {
            const src = (source || '').toLowerCase()
            const srcStyle = SOURCE_STYLES[src] || { background: '#f0f2f8', color: 'var(--text-muted)' }
            const total = stats.total || 1
            const pct = Math.round((parseInt(count) / total) * 100)
            return (
              <div key={source} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 0', borderBottom: '1px solid var(--border-light)',
              }}>
                <span style={{
                  ...srcStyle, borderRadius: 999, padding: '4px 12px',
                  fontSize: 12, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0,
                }}>
                  {src.charAt(0).toUpperCase() + src.slice(1)}
                </span>
                <div style={{ flex: 1, height: 5, background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: srcStyle.color, borderRadius: 999, width: `${pct}%`, opacity: 0.7 }} />
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 800, color: 'var(--text-dark)',
                  flexShrink: 0, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CARD 4 — Quick Stats ── */}
      {stats && (
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid var(--border-light)',
          padding: '14px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>
          <div className="section-heading" style={{ marginBottom: 10 }}>Quick Stats</div>
          {[
            { icon: CheckCircle2, label: 'Applied',       value: stats.total_applied || 0,        color: '#10b981' },
            { icon: SkipForward,  label: 'Skipped',       value: stats.total_skipped || 0,        color: '#f59e0b' },
            { icon: Target,       label: 'Avg Score',     value: `${stats.avg_score || 0}/100`,   color: '#6366f1' },
            { icon: Zap,          label: 'Applied Today', value: stats.applied_today || 0,        color: '#06b6d4' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0', borderBottom: '1px solid var(--border-light)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={14} strokeWidth={2} color={color} />
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 15, fontWeight: 800, color: color,
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}