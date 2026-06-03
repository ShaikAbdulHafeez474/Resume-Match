import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, Sparkles, Calendar, ExternalLink } from 'lucide-react'
import { getOptimizations } from '../lib/api'

function Skeleton({ h = 16, w = '100%', r = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, var(--bg-soft) 25%, var(--border-light) 50%, var(--bg-soft) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

const SECTION_COLORS = {
  summary:    { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
  experience: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  skills:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  projects:   { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
  education:  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
}

function OptimizationCard({ opt }) {
  const navigate = useNavigate()
  const gain = (opt.ats_score_before && opt.ats_score_after)
    ? opt.ats_score_after - opt.ats_score_before
    : null
  const sections = opt.sections ? Object.keys(opt.sections).filter(k => opt.sections[k]?.improved) : []
  const keywords = Array.isArray(opt.missing_keywords) ? opt.missing_keywords : []

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border-light)',
      borderRadius: 16, padding: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-dark)', marginBottom: 2 }}>{opt.title}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{opt.company}</div>
        </div>
        {gain !== null && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>ATS Score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: '#94a3b8' }}>{opt.ats_score_before}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: '#10b981' }}>{opt.ats_score_after}</span>
              {gain > 0 && (
                <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>+{gain}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sections chips */}
      {sections.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sections.map(s => {
            const c = SECTION_COLORS[s] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
            return (
              <span key={s} style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                {s}
              </span>
            )
          })}
        </div>
      )}

      {/* Missing keywords */}
      {keywords.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Keywords:</span>
          {keywords.slice(0, 4).map((kw, i) => (
            <span key={i} style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', borderRadius: 7, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
              {kw}
            </span>
          ))}
          {keywords.length > 4 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>+{keywords.length - 4} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>
          <Calendar size={11} strokeWidth={1.5} />
          {new Date(opt.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        <button onClick={() => navigate(`/optimizations/${opt.id}`)}
          style={{ padding: '7px 16px', borderRadius: 9, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', color: 'var(--indigo)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          View Details
        </button>
      </div>
    </div>
  )
}

export default function Optimizations() {
  const [optimizations, setOptimizations] = useState([])
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(true)
  const [debounced, setDebounced]         = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { loadData() }, [debounced])

  async function loadData() {
    setLoading(true)
    try {
      const res = await getOptimizations(debounced)
      setOptimizations(res.data.optimizations || [])
    } catch {
      toast.error('Failed to load optimizations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg-page)' }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Optimizations</h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Your saved resume optimization history</p>
      </div>

      {/* Search row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, maxWidth: 440 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by job title or company..."
            style={{ width: '100%', padding: '10px 14px 10px 34px', borderRadius: 10, border: '1px solid var(--border-medium)', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton h={16} w="70%" />
              <Skeleton h={12} w="45%" />
              <Skeleton h={24} />
              <Skeleton h={12} w="60%" />
            </div>
          ))}
        </div>
      ) : optimizations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--indigo-soft)', border: '2px dashed var(--indigo-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={28} strokeWidth={1.5} color="var(--indigo)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)' }}>No optimizations yet</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', maxWidth: 300 }}>
            {search ? 'No results match your search.' : 'Go to Jobs and use Tailor Resume to optimize your resume for each job.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {optimizations.map(opt => <OptimizationCard key={opt.id} opt={opt} />)}
        </div>
      )}
    </div>
  )
}
