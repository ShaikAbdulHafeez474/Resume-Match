import { useNavigate } from 'react-router-dom'
import { Search, CheckCircle } from 'lucide-react'

export default function EmptyState({ type = 'no-jobs', applied = 0, skipped = 0 }) {
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: type === 'all-done' ? 'linear-gradient(135deg,#10b981,#06b6d4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
      }}>
        {type === 'all-done'
          ? <CheckCircle size={36} color="#fff" strokeWidth={1.5} />
          : <Search size={36} color="#fff" strokeWidth={1.5} />
        }
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-dark)' }}>
        {type === 'all-done' ? "You're all caught up!" : 'No jobs found'}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
        {type === 'all-done'
          ? `Applied to ${applied} jobs · Skipped ${skipped}`
          : 'Upload your resume or adjust your filters'
        }
      </p>
      {type !== 'all-done' && (
        <button onClick={() => navigate('/')} style={{
          padding: '10px 24px', borderRadius: 12,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          Upload Resume
        </button>
      )}
    </div>
  )
}
