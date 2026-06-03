import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ExternalLink, CheckCircle2, Sparkles } from 'lucide-react'
import { getOptimizationDetail } from '../lib/api'
import { safeStr, safeKeywords } from '../lib/sectionUtils'
import { ChatMarkdown } from '../components/ChatBubble'

const SECTION_COLORS = {
  summary:    { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
  experience: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  skills:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  projects:   { bg: '#fdf4ff', color: '#9333ea', border: '#e9d5ff' },
  education:  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
}

function SectionDiff({ sectionKey, data }) {
  const c = SECTION_COLORS[sectionKey] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '10px 16px', background: c.bg, borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{sectionKey}</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {safeKeywords(data.keywords_added).slice(0, 4).map((kw, i) => (
            <span key={i} style={{ background: '#fff', color: c.color, border: `1px solid ${c.border}`, borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>+{kw}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <div style={{ padding: '14px 16px', borderRight: '1px solid var(--border-light)', background: '#fafafa' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Current</div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-body)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
            {safeStr(data.original) || '(original not saved)'}
          </p>
        </div>
        <div style={{ padding: '14px 16px', background: '#f0fdf4' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Improved ✓</div>
          <ChatMarkdown content={safeStr(data.improved)} />
        </div>
      </div>
      {data.reason && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-light)', background: '#fff', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#4f46e5', margin: 0, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{safeStr(data.reason)}</p>
        </div>
      )}
    </div>
  )
}

export default function OptimizationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [opt, setOpt]     = useState(null)
  const [tab, setTab]     = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOptimizationDetail(id)
      .then(res => setOpt(res.data))
      .catch(() => { toast.error('Failed to load optimization'); navigate('/optimizations') })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg-page)' }}>
        <div style={{ height: 28, background: 'var(--bg-soft)', borderRadius: 8, width: 200, marginBottom: 20 }} />
        <div style={{ height: 24, background: 'var(--bg-soft)', borderRadius: 8, width: '60%', marginBottom: 12 }} />
        <div style={{ height: 16, background: 'var(--bg-soft)', borderRadius: 8, width: '40%' }} />
      </div>
    )
  }
  if (!opt) return null

  const gain = (opt.ats_score_before && opt.ats_score_after) ? opt.ats_score_after - opt.ats_score_before : null
  const sections = opt.sections ? Object.entries(opt.sections).filter(([, d]) => d?.improved) : []
  const keywords = Array.isArray(opt.missing_keywords) ? opt.missing_keywords : []

  const TABS = [
    { id: 'overview', label: 'Overview' },
    ...sections.map(([key]) => ({ id: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg-page)' }}>
      {/* Back + header */}
      <button onClick={() => navigate('/optimizations')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>
        <ArrowLeft size={15} /> Back to Optimizations
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 4px' }}>{opt.title}</h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px' }}>{opt.company} · {opt.location}</p>
          {gain !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: '#94a3b8' }}>{opt.ats_score_before}</span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: '#10b981' }}>{opt.ats_score_after}</span>
              {gain > 0 && (
                <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                  +{gain} points
                </span>
              )}
            </div>
          )}
        </div>
        {opt.apply_url && (
          <a href={opt.apply_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', flexShrink: 0 }}>
            <ExternalLink size={13} /> Apply with this Resume
          </a>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-light)', marginBottom: 20 }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
            fontSize: 13, fontWeight: tab === id ? 800 : 600,
            color: tab === id ? 'var(--indigo)' : 'var(--text-muted)',
            borderBottom: tab === id ? '2px solid var(--indigo)' : '2px solid transparent',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 14 }}>Top Changes Made</div>
            {sections.map(([key]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <CheckCircle2 size={14} strokeWidth={2} color="#10b981" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', textTransform: 'capitalize' }}>{key} section improved</span>
              </div>
            ))}
            {keywords.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Missing Keywords Added</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {keywords.slice(0, 8).map((kw, i) => (
                    <span key={i} style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', border: '1px solid var(--indigo-border)', borderRadius: 7, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 14 }}>Matched Job Details</div>
            {[
              { label: 'Role',     value: opt.title    },
              { label: 'Company',  value: opt.company  },
              { label: 'Location', value: opt.location || '—' },
              { label: 'Saved',    value: new Date(opt.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-soft)', borderRadius: 9, border: '1px solid var(--border-light)', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section diff tabs */}
      {tab !== 'overview' && sections.map(([key, data]) => {
        if (key !== tab) return null
        return <SectionDiff key={key} sectionKey={key} data={data} />
      })}
    </div>
  )
}
