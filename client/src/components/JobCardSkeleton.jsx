export default function JobCardSkeleton() {
  return (
    <div style={{
      width: '100%', background: '#fff', border: '1px solid var(--border-light)',
      borderRadius: 16, padding: '16px 20px', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="skeleton-shimmer" style={{ width: 64, height: 22 }} />
          <div className="skeleton-shimmer" style={{ width: 48, height: 22 }} />
        </div>
        <div className="skeleton-shimmer" style={{ width: 80, height: 14 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <div className="skeleton-shimmer" style={{ width: '65%', height: 20, marginBottom: 6 }} />
          <div className="skeleton-shimmer" style={{ width: '45%', height: 14 }} />
        </div>
        <div>
          <div className="skeleton-shimmer" style={{ width: 52, height: 40, marginBottom: 4 }} />
          <div className="skeleton-shimmer" style={{ width: 52, height: 12 }} />
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border-light)', margin: '10px 0' }} />
      <div className="skeleton-shimmer" style={{ width: '90%', height: 14, marginBottom: 4 }} />
      <div className="skeleton-shimmer" style={{ width: '70%', height: 14, marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <div className="skeleton-shimmer" style={{ width: 60, height: 22 }} />
        <div className="skeleton-shimmer" style={{ width: 72, height: 22 }} />
        <div className="skeleton-shimmer" style={{ width: 55, height: 22 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <div className="skeleton-shimmer" style={{ width: 68, height: 36 }} />
        <div className="skeleton-shimmer" style={{ width: 88, height: 36 }} />
      </div>
    </div>
  )
}
