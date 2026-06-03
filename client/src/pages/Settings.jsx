import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { User, FileText, Crown, Bell } from 'lucide-react'

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} strokeWidth={2} color="var(--indigo)" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, isLoaded } = useUser()
  const { openUserProfile } = useClerk()

  const [targetRole,     setTargetRole]     = useState('')
  const [targetLocation, setTargetLocation] = useState('')
  const [emailNotifs,    setEmailNotifs]    = useState(false)
  const [saved,          setSaved]          = useState(false)

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('resumatch_prefs') || '{}')
      setTargetRole(prefs.targetRole     || '')
      setTargetLocation(prefs.targetLocation || '')
      setEmailNotifs(prefs.emailNotifs    || false)
    } catch {}
  }, [])

  const handleSavePrefs = () => {
    try {
      localStorage.setItem('resumatch_prefs', JSON.stringify({ targetRole, targetLocation, emailNotifs }))
      setSaved(true)
      toast.success('Preferences saved!')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Failed to save preferences')
    }
  }

  const isPremium = user?.publicMetadata?.plan === 'premium'

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 24, background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Manage your account and preferences.</p>
        </div>

        {/* Profile */}
        <Section title="Profile" icon={User}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-light)' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff' }}>
                {(user?.firstName || '?').charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-dark)' }}>{user?.fullName || 'Your Name'}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>{user?.primaryEmailAddress?.emailAddress || ''}</div>
            </div>
          </div>
          <button onClick={() => openUserProfile()}
            style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--indigo-soft)', border: '1px solid var(--indigo-border)', color: 'var(--indigo)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Manage Account
          </button>
        </Section>

        {/* Resume Defaults */}
        <Section title="Job Search Preferences" icon={FileText}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Target Role</label>
              <input value={targetRole} onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Software Engineer, Data Scientist..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-medium)', fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Target Location</label>
              <input value={targetLocation} onChange={e => setTargetLocation(e.target.value)}
                placeholder="e.g. Bangalore, Remote, USA..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-medium)', fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleSavePrefs}
              style={{ alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 10, background: saved ? 'var(--green-soft)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: saved ? '#15803d' : '#fff', fontWeight: 700, fontSize: 13, border: saved ? '1px solid var(--green-border)' : 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 0.2s' }}>
              {saved ? '✓ Saved!' : 'Save Preferences'}
            </button>
          </div>
        </Section>

        {/* Subscription */}
        <Section title="Subscription" icon={Crown}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>
                Current Plan: {isPremium ? '✨ Premium' : '🎯 Free'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>
                {isPremium ? 'Enjoy all premium features.' : 'Upgrade to unlock unlimited AI tools, more job matches, and priority support.'}
              </div>
            </div>
            {!isPremium && (
              <button
                style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '0 4px 12px rgba(99,102,241,0.3)', flexShrink: 0, marginLeft: 16 }}>
                Upgrade to Premium
              </button>
            )}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>Email Notifications</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>Receive updates about new job matches and activity.</div>
            </div>
            <div
              onClick={() => { setEmailNotifs(!emailNotifs); localStorage.setItem('resumatch_prefs', JSON.stringify({ targetRole, targetLocation, emailNotifs: !emailNotifs })) }}
              style={{ width: 44, height: 24, borderRadius: 999, background: emailNotifs ? 'var(--indigo)' : 'var(--border-medium)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: emailNotifs ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
