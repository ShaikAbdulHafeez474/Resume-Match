import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Zap, Crown, Sparkles, ArrowLeft } from 'lucide-react'
import { createOrder, verifyPayment } from '../lib/api'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    icon: <Sparkles size={22} />,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    badge: null,
    cta: 'Current Plan',
    ctaDisabled: true,
    features: [
      '5 job fetches / month',
      'Resume upload & PDF parsing',
      'ATS score for 2 jobs',
      'Dashboard & skill insights',
      'Job tracking (Applied / Saved / Skipped)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹9',
    period: '/ month',
    icon: <Zap size={22} />,
    color: '#6366f1',
    bg: 'linear-gradient(135deg,#eef2ff,#f5f3ff)',
    border: '#c7d2fe',
    badge: 'Most Popular',
    cta: 'Get Pro',
    ctaDisabled: false,
    features: [
      '50 job fetches / month',
      'Unlimited ATS scoring',
      '10 resume tailoring / month',
      'Saved optimizations library',
      'Skill insights & ATS trends',
      'Priority job matching',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '₹19',
    period: '/ month',
    icon: <Crown size={22} />,
    color: '#b45309',
    bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
    border: '#fcd34d',
    badge: 'All Access',
    cta: 'Get Elite',
    ctaDisabled: false,
    features: [
      'Unlimited job fetches',
      'Unlimited ATS scoring',
      'Unlimited resume tailoring',
      'AI Resume Coach (chat)',
      'Cold email generator',
      'Early access to new features',
      'Everything in Pro',
    ],
  },
]

export default function Pricing() {
  const navigate  = useNavigate()
  const [loading, setLoading] = useState(null) // plan id being processed

  useEffect(() => {
    loadRazorpay()
  }, [])

  const handleBuy = async (plan) => {
    if (plan.ctaDisabled) return
    setLoading(plan.id)
    try {
      const ok = await loadRazorpay()
      if (!ok) { toast.error('Failed to load payment gateway. Try again.'); return }

      const orderRes = await createOrder(plan.id)
      const { orderId, amount, currency, key } = orderRes.data

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key,
          amount,
          currency,
          order_id: orderId,
          name: 'ResuMatch',
          description: `${plan.name} Plan — 1 month`,
          theme: { color: plan.color },
          handler: async (response) => {
            try {
              await verifyPayment({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                plan: plan.id,
              })
              toast.success(`🎉 Welcome to ${plan.name}! Your plan is now active.`)
              navigate('/')
              resolve()
            } catch (e) {
              toast.error('Payment verification failed. Contact support.')
              reject(e)
            }
          },
          modal: { ondismiss: resolve },
        })
        rzp.open()
      })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', fontFamily: FONT }}>
      {/* Nav */}
      <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-light)', background: '#fff' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, fontFamily: FONT }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border-light)' }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)' }}>ResuMatch Pricing</div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '60px 24px 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 999, padding: '6px 16px', fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 20 }}>
          <Sparkles size={14} /> Simple, transparent pricing
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-dark)', margin: '0 0 14px', letterSpacing: '-0.02em', fontFamily: FONT }}>
          Choose your plan
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-muted)', fontWeight: 500, margin: '0 auto', maxWidth: 480, lineHeight: 1.7 }}>
          Start free, upgrade when you need more. No hidden fees, cancel anytime.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', padding: '0 24px 80px', flexWrap: 'wrap', alignItems: 'stretch' }}>
        {PLANS.map((plan) => (
          <div key={plan.id} style={{
            width: 320, borderRadius: 20, border: `2px solid ${plan.border}`,
            background: plan.bg, display: 'flex', flexDirection: 'column',
            boxShadow: plan.id === 'pro' ? '0 8px 40px rgba(99,102,241,0.15)' : '0 2px 16px rgba(0,0,0,0.05)',
            position: 'relative', overflow: 'hidden',
          }}>
            {plan.badge && (
              <div style={{
                position: 'absolute', top: 16, right: 16,
                background: plan.id === 'elite' ? '#b45309' : '#6366f1',
                color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999,
                padding: '4px 12px', letterSpacing: '0.05em',
              }}>
                {plan.badge}
              </div>
            )}

            <div style={{ padding: '28px 28px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: `1.5px solid ${plan.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: plan.color }}>
                  {plan.icon}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-dark)', fontFamily: FONT }}>{plan.name}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: plan.color, fontFamily: FONT, lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 500 }}>{plan.period}</span>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${plan.border}`, padding: '20px 28px', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: plan.id === 'free' ? '#f1f5f9' : plan.id === 'pro' ? '#eef2ff' : '#fffbeb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                      <Check size={12} strokeWidth={2.5} color={plan.color} />
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-body)', fontWeight: 500, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '20px 28px 28px' }}>
              <button
                onClick={() => handleBuy(plan)}
                disabled={plan.ctaDisabled || loading === plan.id}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, fontWeight: 800, fontSize: 15,
                  border: 'none', cursor: plan.ctaDisabled ? 'default' : 'pointer', fontFamily: FONT,
                  background: plan.ctaDisabled
                    ? '#f1f5f9'
                    : plan.id === 'pro'
                      ? '#6366f1'
                      : plan.id === 'elite'
                        ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                        : '#f1f5f9',
                  color: plan.ctaDisabled ? '#94a3b8' : '#fff',
                  boxShadow: !plan.ctaDisabled && plan.id === 'pro' ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.15s',
                  opacity: loading && loading !== plan.id ? 0.6 : 1,
                }}
              >
                {loading === plan.id ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Processing...</>
                ) : plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
