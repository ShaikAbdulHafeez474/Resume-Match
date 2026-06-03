import {
  CheckCircle2, AlertTriangle, Lightbulb, ArrowRight, Sparkles,
  Target, TrendingUp, Zap, FileText, Briefcase, Award,
} from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

const IMPACT = {
  High:   { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  Medium: { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  Low:    { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
}

function ImpactBadge({ impact }) {
  const cfg = IMPACT[impact] || IMPACT.Medium
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
      padding: '4px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap',
    }}>
      {impact || 'Medium'} Impact
    </span>
  )
}

function SectionHeader({ number, title, icon: Icon = Sparkles }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      {number != null && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, fontWeight: 800, color: '#fff',
        }}>
          {number}
        </div>
      )}
      {Icon && <Icon size={16} strokeWidth={2} color="var(--indigo)" />}
      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)', fontFamily: FONT }}>
        {title}
      </span>
    </div>
  )
}

function StrengthCards({ section }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader number={section.number} title={section.title || 'Key Highlights'} icon={CheckCircle2} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(section.items || []).map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '14px 16px', background: '#fff',
            border: '1px solid var(--border-light)', borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: '#6366f1', marginTop: 7,
            }} />
            <div style={{ flex: 1 }}>
              {item.heading && (
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 4, fontFamily: FONT }}>
                  {item.heading}
                </div>
              )}
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-body)', fontFamily: FONT, fontWeight: 500 }}>
                {item.body || item.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BeforeAfter({ section, compact }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader number={section.number} title={section.title} icon={FileText} />
      <div style={{
        display: 'flex', flexDirection: compact ? 'column' : 'row',
        gap: 12, alignItems: 'stretch',
      }}>
        <div style={{
          flex: 1, padding: '14px 16px', borderRadius: 12,
          background: '#fef2f2', border: '1px solid #fecaca',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Current
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-body)', fontFamily: FONT, fontWeight: 500 }}>
            {section.before}
          </div>
        </div>
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--indigo)' }}>
            <ArrowRight size={20} strokeWidth={2.5} />
          </div>
        )}
        <div style={{
          flex: 1, padding: '14px 16px', borderRadius: 12,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Recommended
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-body)', fontFamily: FONT, fontWeight: 500 }}>
            {section.after}
          </div>
        </div>
      </div>
      {section.why && (
        <div style={{
          marginTop: 12, padding: '12px 16px', borderRadius: 10,
          background: '#eef2ff', border: '1px solid #c7d2fe',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Lightbulb size={16} strokeWidth={2} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#4338ca', marginBottom: 4 }}>Why this works</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)', fontFamily: FONT }}>{section.why}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function SkillsCompare({ section, compact }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader number={section.number} title={section.title || 'Skills Enhancement'} icon={Target} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
        gap: 14,
      }}>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Current Skills
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(section.current || []).map((s, i) => (
              <span key={i} style={{
                fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 8,
                background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
              }}>{s}</span>
            ))}
          </div>
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Recommended Additions
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(section.recommended || []).map((s, i) => (
              <span key={i} style={{
                fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 8,
                background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
              }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BulletImprovements({ section, compact }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader number={section.number} title={section.title || 'Improvements'} icon={Briefcase} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(section.items || []).map((item, i) => (
          <div key={i} style={{
            border: '1px solid var(--border-light)', borderRadius: 14,
            overflow: 'hidden', background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              padding: '10px 16px', background: 'var(--indigo-soft)',
              borderBottom: '1px solid var(--indigo-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--indigo)', fontFamily: FONT }}>
                {item.name || item.heading}
              </span>
              {item.impact && <ImpactBadge impact={item.impact} />}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
              gap: 0,
            }}>
              <div style={{
                padding: '14px 16px',
                borderRight: compact ? 'none' : '1px solid var(--border-light)',
                borderBottom: compact ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Current</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)', fontFamily: FONT }}>{item.before}</div>
              </div>
              <div style={{ padding: '14px 16px', background: '#fafbff' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Optimized</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-body)', fontFamily: FONT }}>{item.after}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightsTags({ section }) {
  const isWarn = section.tone === 'warn'
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader number={section.number} title={section.title} icon={isWarn ? AlertTriangle : Target} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(section.tags || []).map((tag, i) => (
          <span key={i} style={{
            fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
            background: isWarn ? '#fff7ed' : 'var(--indigo-soft)',
            color: isWarn ? '#c2410c' : 'var(--indigo)',
            border: `1px solid ${isWarn ? '#fed7aa' : 'var(--indigo-border)'}`,
          }}>{tag}</span>
        ))}
      </div>
    </div>
  )
}

function CalloutBox({ section }) {
  const variants = {
    tip:  { bg: '#eef2ff', border: '#c7d2fe', icon: Lightbulb, color: '#4338ca' },
    warn: { bg: '#fffbeb', border: '#fde68a', icon: AlertTriangle, color: '#b45309' },
    ok:   { bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle2, color: '#15803d' },
  }
  const v = variants[section.variant] || variants.tip
  const Icon = v.icon
  return (
    <div style={{
      marginBottom: 16, padding: '14px 16px', borderRadius: 12,
      background: v.bg, border: `1px solid ${v.border}`,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <Icon size={18} strokeWidth={2} color={v.color} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        {section.title && (
          <div style={{ fontSize: 13, fontWeight: 800, color: v.color, marginBottom: 4, fontFamily: FONT }}>{section.title}</div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-body)', fontFamily: FONT, fontWeight: 500 }}>
          {section.body || section.text}
        </div>
      </div>
    </div>
  )
}

function MetricsRow({ metrics }) {
  if (!metrics?.length) return null
  const icons = [TrendingUp, Zap, Target, Award]
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18,
    }}>
      {metrics.map((m, i) => {
        const Icon = icons[i % icons.length]
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 12,
            background: '#fff', border: '1px solid var(--border-light)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={15} strokeWidth={2} color="var(--indigo)" />
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1 }}>
                {m.value}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>{m.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function renderSection(section, i, compact) {
  const s = { ...section, number: section.number ?? (i + 1) }
  switch (section.type) {
    case 'strength_cards':    return <StrengthCards key={i} section={s} />
    case 'before_after':      return <BeforeAfter key={i} section={s} compact={compact} />
    case 'skills_compare':    return <SkillsCompare key={i} section={s} compact={compact} />
    case 'bullet_improvements': return <BulletImprovements key={i} section={s} compact={compact} />
    case 'insights':          return <InsightsTags key={i} section={s} />
    case 'callout':           return <CalloutBox key={i} section={s} />
    default:                  return null
  }
}

export function parseCoachStructured(text) {
  if (!text || typeof text !== 'string') return null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (parsed.sections && Array.isArray(parsed.sections)) return parsed
    return null
  } catch {
    return null
  }
}

export default function CoachResponseView({ data, compact = false }) {
  if (!data) return null

  return (
    <div style={{
      fontFamily: FONT,
      maxWidth: compact ? '100%' : '100%',
    }}>
      {data.headline && (
        <div style={{
          fontSize: compact ? 16 : 18, fontWeight: 800, color: 'var(--text-dark)',
          marginBottom: 12, letterSpacing: '-0.02em', lineHeight: 1.3,
        }}>
          {data.headline}
        </div>
      )}

      {data.executive_summary && (
        <div style={{
          padding: '14px 18px', borderRadius: 14, marginBottom: 16,
          background: 'linear-gradient(135deg, #fafbff 0%, #f8fafc 100%)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(99,102,241,0.05)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Executive Summary
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-body)', fontWeight: 500 }}>
            {data.executive_summary}
          </div>
        </div>
      )}

      <MetricsRow metrics={data.metrics} />

      {(data.sections || []).map((section, i) => renderSection(section, i, compact))}
    </div>
  )
}
