import { Layers, Zap, CheckCircle2, Target } from 'lucide-react'

const STAT_CONFIG = [
  {
    key:   'total',
    label: 'Total Matches',
    icon:  Layers,
    grad:  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    bg:    'var(--indigo-soft)',
    iconColor: '#6366f1',
    border: 'var(--indigo-border)',
  },
  {
    key:   'strong_fit',
    label: 'Strong Fit',
    icon:  Zap,
    grad:  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    bg:    'var(--blue-soft)',
    iconColor: '#06b6d4',
    border: 'var(--blue-border)',
  },
  {
    key:   'total_applied',
    label: 'Applied',
    icon:  CheckCircle2,
    grad:  'linear-gradient(135deg, #10b981 0%, #22c55e 100%)',
    bg:    'var(--green-soft)',
    iconColor: '#10b981',
    border: 'var(--green-border)',
  },
  {
    key:   'avg_score',
    label: 'Avg Score',
    icon:  Target,
    grad:  'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    bg:    'var(--orange-soft)',
    iconColor: '#f59e0b',
    border: 'var(--orange-border)',
  },
]

export default function StatBar({ stats }) {
  return (
    <div style={{
      width: '100%',
      height: 64,
      background: '#fff',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
    }}>
      {STAT_CONFIG.map(({ key, label, icon: Icon, grad, bg, iconColor, border }, i) => {
        const value = stats?.[key] ?? 0
        const isLast = i === STAT_CONFIG.length - 1

        return (
          <div
            key={key}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 28px',
              borderRight: isLast ? 'none' : '1px solid var(--border-light)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle gradient bg strip on left */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 3,
              background: grad,
            }} />

            {/* Icon container */}
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: bg,
              border: `1px solid ${border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={18} strokeWidth={2} color={iconColor} />
            </div>

            {/* Text */}
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                fontSize: 26,
                lineHeight: 1,
                background: grad,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}>
                {value}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginTop: 2,
                lineHeight: 1,
              }}>
                {label}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}