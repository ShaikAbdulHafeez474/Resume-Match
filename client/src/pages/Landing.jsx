import { SignInButton, SignUpButton } from '@clerk/clerk-react'
import { Sparkles, CheckCircle2 } from 'lucide-react'

export default function Landing() {
  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
    }}>

      {/* LEFT — gradient side */}
      <div style={{
        width: '45%', flexShrink: 0,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 56px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="#fff" strokeWidth={2} />
          </div>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 22, color: '#fff',
          }}>
            RésuMatch
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800, fontSize: 44, color: '#fff',
          lineHeight: 1.1, marginBottom: 16,
        }}>
          Find jobs that actually fit you.
        </h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 16, fontWeight: 500,
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.6, marginBottom: 40, maxWidth: 380,
        }}>
          Upload your resume and let AI match you with the best opportunities across LinkedIn, Indeed and Naukri.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            'Analyzes your resume with Gemini AI',
            'Searches LinkedIn, Indeed & Naukri',
            'Scores every job against your profile',
            'Tracks applied and skipped jobs',
          ].map(text => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={18} strokeWidth={2.5} color="rgba(255,255,255,0.9)" />
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 15, fontWeight: 600,
                color: 'rgba(255,255,255,0.9)',
              }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{
          marginTop: 'auto', paddingTop: 48,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12, fontWeight: 500,
          color: 'rgba(255,255,255,0.5)',
        }}>
          Free to use · No credit card required
        </p>
      </div>

      {/* RIGHT — auth side */}
      <div style={{
        flex: 1, background: '#f8f9fc',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: 28,
            color: 'var(--text-dark)', marginBottom: 8,
          }}>
            Get started
          </h2>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14, fontWeight: 500,
            color: 'var(--text-muted)', marginBottom: 32,
          }}>
            Sign in or create a free account to continue
          </p>

          {/* Sign up button */}
          <SignUpButton mode="modal">
            <button style={{
              width: '100%', padding: '14px 0',
              borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 15,
              cursor: 'pointer', marginBottom: 12,
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}>
              <Sparkles size={16} strokeWidth={2.5} />
              Create free account
            </button>
          </SignUpButton>

          {/* Sign in button */}
          <SignInButton mode="modal">
            <button style={{
              width: '100%', padding: '14px 0',
              borderRadius: 12,
              background: '#fff',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-dark)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 15,
              cursor: 'pointer',
            }}>
              Sign in to existing account
            </button>
          </SignInButton>

          <p style={{
            marginTop: 24, textAlign: 'center',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, fontWeight: 500,
            color: 'var(--text-muted)',
          }}>
            By continuing you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}