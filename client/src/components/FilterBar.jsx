import { SlidersHorizontal, Wifi, ListFilter, ArrowUpDown } from 'lucide-react'

const SOURCE_OPTIONS = [
  { value: 'all',           label: '🌐 All Sources' },
  { value: 'linkedin',      label: '💼 LinkedIn'    },
  { value: 'indeed',        label: '🔵 Indeed'      },
  { value: 'naukri',        label: '🟡 Naukri'      },
  { value: 'google',        label: '🔴 Google Jobs' },
  { value: 'remotive',      label: '🟣 Remotive'    },
  { value: 'zip_recruiter', label: '🔷 ZipRecruiter'},
  { value: 'glassdoor',     label: '🟢 Glassdoor'   },
]

const SORT_OPTIONS = [
  { value: 'score',   label: '⚡ Best Match' },
  { value: 'newest',  label: '🕐 Newest'     },
  { value: 'company', label: '🔤 Company A–Z'},
]

function ScoreBadge({ value }) {
  let color
  if (value >= 80)      color = '#06b6d4'
  else if (value >= 65) color = '#10b981'
  else if (value >= 45) color = '#f59e0b'
  else if (value > 0)   color = '#94a3b8'
  else                  color = '#6366f1'

  return (
    <span style={{
      minWidth: 36,
      textAlign: 'center',
      padding: '3px 10px',
      borderRadius: 999,
      border: `1px solid ${color}30`,
      background: `${color}15`,
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 800,
      fontSize: 13,
      color: color,
    }}>
      {value}
    </span>
  )
}

const selectStyle = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-light)',
  background: '#fff',
  color: 'var(--text-dark)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b94b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 32,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
}

export default function FilterBar({ filters, onChange, total }) {
  return (
    <div style={{
      width: '100%',
      height: 60,
      background: '#fff',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '0 28px',
      flexShrink: 0,
      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
    }}>

      {/* ── Filter label ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        marginRight: 20, flexShrink: 0,
      }}>
        <SlidersHorizontal size={16} strokeWidth={2} color="var(--indigo)" />
        <span style={{
          fontSize: 13, fontWeight: 800,
          color: 'var(--text-dark)',
          letterSpacing: '0.02em',
        }}>
          Filters
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border-light)', marginRight: 20, flexShrink: 0 }} />

      {/* ── Min Score ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginRight: 20, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: 'var(--text-body)', whiteSpace: 'nowrap',
        }}>
          Min Score
        </span>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="range" min="0" max="100" value={filters.minScore}
            onChange={e => onChange({ ...filters, minScore: parseInt(e.target.value) })}
            style={{
              width: 110,
              accentColor: '#6366f1',
              cursor: 'pointer',
              height: 4,
            }}
          />
        </div>
        <ScoreBadge value={filters.minScore} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border-light)', marginRight: 20, flexShrink: 0 }} />

      {/* ── Remote Toggle ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        marginRight: 20, flexShrink: 0, cursor: 'pointer',
      }}
        onClick={() => onChange({ ...filters, remote: !filters.remote })}
      >
        <div style={{
          width: 42, height: 24, borderRadius: 999,
          background: filters.remote
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'var(--border-medium)',
          position: 'relative',
          boxShadow: filters.remote ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
          flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute',
            top: 3,
            left: filters.remote ? 21 : 3,
            width: 18, height: 18,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 200ms cubic-bezier(0.16,1,0.3,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {filters.remote && (
              <Wifi size={9} strokeWidth={2.5} color="#6366f1" />
            )}
          </div>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: filters.remote ? 'var(--indigo)' : 'var(--text-body)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>
          Remote Only
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border-light)', marginRight: 20, flexShrink: 0 }} />

      {/* ── Source Select ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12, flexShrink: 0 }}>
        <ListFilter size={14} strokeWidth={2} color="var(--text-muted)" />
        <select
          value={filters.source}
          onChange={e => onChange({ ...filters, source: e.target.value })}
          style={{ ...selectStyle, width: 160 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-medium)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)' }}
        >
          {SOURCE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* ── Sort Select ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <ArrowUpDown size={14} strokeWidth={2} color="var(--text-muted)" />
        <select
          value={filters.sort}
          onChange={e => onChange({ ...filters, sort: e.target.value })}
          style={{ ...selectStyle, width: 160 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-medium)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)' }}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* ── Jobs count — pushed to right ── */}
      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
        {total !== undefined && total > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 999,
            background: 'var(--indigo-soft)',
            border: '1px solid var(--indigo-border)',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--indigo)',
              boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
            }} />
            <span style={{
              fontSize: 13, fontWeight: 800,
              color: 'var(--indigo)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {total}
            </span>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--text-muted)',
            }}>
              jobs found
            </span>
          </div>
        )}
      </div>
    </div>
  )
}