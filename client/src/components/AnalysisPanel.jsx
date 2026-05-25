const CHIP_CLASSES = ['chip-0','chip-1','chip-2','chip-3','chip-4']

const FIT_GRAD = {
  strong: { grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)', dot: '#06b6d4', label: 'Strong (80+)' },
  good:   { grad: 'linear-gradient(135deg,#10b981,#06b6d4)', dot: '#10b981', label: 'Good (65–79)'  },
  decent: { grad: 'linear-gradient(135deg,#f59e0b,#f97316)', dot: '#f59e0b', label: 'Decent (45–64)'},
  weak:   { grad: 'linear-gradient(135deg,#94a3b8,#64748b)', dot: '#94a3b8', label: 'Weak (<45)'    },
}

const SOURCE_STYLES = {
  linkedin:      { background: '#e8f0fe', color: '#1d4ed8', borderLeft: '3px solid #1d4ed8' },
  indeed:        { background: '#fff0e6', color: '#c2410c', borderLeft: '3px solid #f97316' },
  naukri:        { background: '#fef9e7', color: '#b45309', borderLeft: '3px solid #eab308' },
  remotive:      { background: '#f5f3ff', color: '#7c3aed', borderLeft: '3px solid #8b5cf6' },
  google:        { background: '#fef9e7', color: '#b45309', borderLeft: '3px solid #eab308' },
  zip_recruiter: { background: '#eff6ff', color: '#1d4ed8', borderLeft: '3px solid #3b82f6' },
  glassdoor:     { background: '#f0fdf4', color: '#15803d', borderLeft: '3px solid #22c55e' },
}

export default function AnalysisPanel({ analysis, stats, isManual = false }) {
  if (!analysis) return (
    <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
      Loading profile...
    </div>
  )

  const initials = (analysis.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const decent = (stats?.total || 0) - (stats?.strong_fit || 0) - (stats?.good_fit || 0) - (stats?.weak_fit || 0)
  const maxCount = Math.max(stats?.strong_fit || 0, stats?.good_fit || 0, decent, stats?.weak_fit || 0, 1)

  const breakdownRows = [
    { key: 'strong', count: stats?.strong_fit || 0 },
    { key: 'good',   count: stats?.good_fit   || 0 },
    { key: 'decent', count: Math.max(0, decent) },
    { key: 'weak',   count: stats?.weak_fit   || 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Card 1 — Candidate Profile */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {/* Gradient strip — 96px */}
        <div style={{ height: 96, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)' }}>
            {initials}
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, lineHeight: 1.2 }}>{analysis.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, marginTop: 2 }}>{analysis.current_title}</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              {analysis.experience_level}
            </span>
            <span style={{ background: 'var(--bg-soft)', color: 'var(--text-body)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
              {analysis.years_of_experience}y exp
            </span>
          </div>
          {analysis.summary && (
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 14 }}>{analysis.summary}</p>
          )}
          {analysis.core_skills?.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Core Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {analysis.core_skills.slice(0, 12).map((skill, i) => (
                  <span key={skill} className={CHIP_CLASSES[i % CHIP_CLASSES.length]}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, borderRadius: 8, padding: '4px 12px' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card 2 — Match Breakdown */}
      {stats && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-light)', padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>{isManual ? 'Results Summary' : 'Match Breakdown'}</div>
          {breakdownRows.map(({ key, count }) => {
            const { grad, dot, label } = FIT_GRAD[key]
            const pct = Math.round((count / (stats.total || 1)) * 100)
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)' }}>{count}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-page)', width: '100%' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: grad, transition: 'width 600ms ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Card 3 — Sources */}
      {stats?.sources?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border-light)', padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 14 }}>Sources</div>
          {stats.sources.map(({ source, count }) => {
            const s = (source || 'unknown').toLowerCase()
            const style = SOURCE_STYLES[s] || { background: '#f0f2f8', color: 'var(--text-body)', borderLeft: '3px solid #94a3b8' }
            return (
              <div key={source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, marginBottom: 4, ...style }}>
                <span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{source}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
