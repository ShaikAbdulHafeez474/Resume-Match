import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { adminGetUsers, adminUpdatePlan, adminRemovePlan, adminGetStats } from '../lib/api'
import { Search, RefreshCw, Download, Users, ChevronDown } from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

const PLAN_BADGE = {
  free:  { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  pro:   { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
  elite: { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
}

function isExpired(expires) {
  if (!expires) return false
  return new Date(expires) < new Date()
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Login screen ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    try {
      await adminGetStats(key.trim())
      sessionStorage.setItem('admin_key', key.trim())
      onLogin(key.trim())
    } catch {
      toast.error('Invalid admin key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 44px', width: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: '#eef2ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Users size={24} color="#6366f1" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Admin Panel</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Enter your admin secret key</div>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Admin secret key"
            style={{ padding: '12px 16px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: FONT, outline: 'none' }}
          />
          <button type="submit" disabled={loading} style={{
            padding: '13px 0', borderRadius: 11, background: '#6366f1', color: '#fff',
            fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONT,
          }}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Plan update dropdown per row ──────────────────────────────────────────────
function PlanAction({ user, adminKey, onRefresh }) {
  const [open, setOpen]     = useState(false)
  const [plan, setPlan]     = useState(user.plan || 'free')
  const [days, setDays]     = useState(30)
  const [loading, setLoading] = useState(false)

  const apply = async () => {
    setLoading(true)
    try {
      await adminUpdatePlan(user.id, plan, days, adminKey)
      toast.success(`Updated ${user.email || user.name} → ${plan}`)
      setOpen(false)
      onRefresh()
    } catch { toast.error('Update failed') }
    finally { setLoading(false) }
  }

  const remove = async () => {
    setLoading(true)
    try {
      await adminRemovePlan(user.id, adminKey)
      toast.success(`Downgraded ${user.email || user.name} to Free`)
      onRefresh()
    } catch { toast.error('Remove failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
        background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontFamily: FONT,
        fontSize: 12, fontWeight: 700, color: '#334155',
      }}>
        Actions <ChevronDown size={12} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Set Plan</div>
          <select value={plan} onChange={e => setPlan(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: FONT, outline: 'none' }}>
            {['free', 'pro', 'elite'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          {plan !== 'free' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={days} onChange={e => setDays(Number(e.target.value))} min={1} max={365}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: FONT, outline: 'none' }} />
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: FONT }}>days</span>
            </div>
          )}
          <button onClick={apply} disabled={loading} style={{ padding: '8px 0', borderRadius: 8, background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: FONT }}>
            {loading ? '...' : 'Apply'}
          </button>
          {user.plan !== 'free' && (
            <button onClick={remove} disabled={loading} style={{ padding: '8px 0', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: 13, border: '1px solid #fecaca', cursor: 'pointer', fontFamily: FONT }}>
              Remove Plan
            </button>
          )}
          <button onClick={() => setOpen(false)} style={{ padding: '6px 0', borderRadius: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Admin page ───────────────────────────────────────────────────────────
export default function Admin() {
  const storedKey = sessionStorage.getItem('admin_key')
  const [adminKey, setAdminKey] = useState(storedKey || null)
  const [stats,   setStats]   = useState(null)
  const [users,   setUsers]   = useState([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (key = adminKey, q = search) => {
    if (!key) return
    setLoading(true)
    try {
      const [sRes, uRes] = await Promise.all([
        adminGetStats(key),
        adminGetUsers(q || undefined, key),
      ])
      setStats(sRes.data)
      setUsers(uRes.data.users || [])
    } catch (err) {
      toast.error('Failed to load data')
      if (err.response?.status === 401) { sessionStorage.removeItem('admin_key'); setAdminKey(null) }
    } finally {
      setLoading(false)
    }
  }, [adminKey, search])

  useEffect(() => { if (adminKey) load() }, [adminKey])

  const exportCSV = () => {
    const header = ['ID', 'Name', 'Email', 'Plan', 'Plan Expires', 'Fetch Used', 'Score Used', 'Tailor Used', 'Joined']
    const rows = users.map(u => [
      u.id, u.name || '', u.email || '', u.plan || 'free',
      fmtDate(u.plan_expires_at), u.fetch_count || 0, u.score_count || 0, u.tailor_count || 0,
      fmtDate(u.created_at),
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (!adminKey) return <AdminLogin onLogin={k => { setAdminKey(k); sessionStorage.setItem('admin_key', k) }} />

  const STAT_CARDS = stats ? [
    { label: 'Total Users',   value: stats.total,       color: '#334155' },
    { label: 'Free',          value: stats.free_count,  color: '#64748b' },
    { label: 'Pro',           value: stats.pro_count,   color: '#6366f1' },
    { label: 'Elite',         value: stats.elite_count, color: '#b45309' },
    { label: 'Est. MRR',      value: `₹${stats.mrr}`,  color: '#15803d' },
  ] : []

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>ResuMatch Admin</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => load()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
          </button>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: FONT }}>
            <Download size={13} /> Export CSV
          </button>
          <button onClick={() => { sessionStorage.removeItem('admin_key'); setAdminKey(null) }} style={{ padding: '8px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            {STAT_CARDS.map(({ label, value, color }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 14, padding: '18px 24px', flex: '1 1 140px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search + table */}
        <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') load(adminKey, e.target.value) }}
                placeholder="Search by email..."
                style={{ width: '100%', padding: '9px 14px 9px 32px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={() => load(adminKey, search)} style={{ padding: '9px 18px', borderRadius: 10, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4f46e5', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>
              Search
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{users.length} users</div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#fafbff' }}>
                  {['Name / Email', 'Plan', 'Plan Expires', 'Fetch', 'Score', 'Tailor', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: FONT }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontFamily: FONT }}>Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontFamily: FONT }}>No users found.</td></tr>
                ) : users.map((u) => {
                  const expired  = isExpired(u.plan_expires_at)
                  const badge    = PLAN_BADGE[u.plan || 'free'] || PLAN_BADGE.free
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fafbff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{u.name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{u.email || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 999, padding: '3px 10px', textTransform: 'capitalize' }}>
                          {u.plan || 'free'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: expired ? '#dc2626' : '#334155', fontWeight: expired ? 700 : 500, whiteSpace: 'nowrap' }}>
                        {fmtDate(u.plan_expires_at)}{expired && ' ⚠'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'center', fontWeight: 600 }}>{u.fetch_count ?? 0}</td>
                      <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'center', fontWeight: 600 }}>{u.score_count ?? 0}</td>
                      <td style={{ padding: '12px 16px', color: '#334155', textAlign: 'center', fontWeight: 600 }}>{u.tailor_count ?? 0}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <PlanAction user={u} adminKey={adminKey} onRefresh={() => load()} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
