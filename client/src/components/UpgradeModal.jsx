import { useNavigate } from 'react-router-dom'
import { Lock, X, Zap } from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

const FEATURE_LABELS = {
  fetch:  'job fetching',
  score:  'ATS scoring',
  tailor: 'resume tailoring',
  coach:  'AI Resume Coach',
}

export default function UpgradeModal({ feature, onClose }) {
  const navigate = useNavigate()
  const label = FEATURE_LABELS[feature] || feature || 'this feature'

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 22, width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden',
        fontFamily: FONT,
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '28px 28px 22px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#fff" />
          </button>
          <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Lock size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Limit reached</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500, lineHeight: 1.6 }}>
            You've used up your free quota for <strong style={{ color: '#fff' }}>{label}</strong>.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { plan: 'Pro — ₹9/mo', desc: '50 fetches, unlimited scoring, 10 tailoring/month', color: '#6366f1' },
              { plan: 'Elite — ₹19/mo', desc: 'Unlimited everything + AI Coach', color: '#b45309' },
            ].map(({ plan, desc, color }) => (
              <div key={plan} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Zap size={15} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>{plan}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { onClose(); navigate('/pricing') }}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12, background: '#6366f1',
              color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer',
              fontFamily: FONT, boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            View Plans
          </button>

          <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '11px 0', borderRadius: 12, background: 'none', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: FONT }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
