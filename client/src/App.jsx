import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Applied from './pages/Applied'
import Skipped from './pages/Skipped'
import Stats from './pages/Stats'
import { syncUser } from './lib/api'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Syncs Clerk user to our DB on every login
function UserSync() {
  const { user, isLoaded } = useUser()
  useEffect(() => {
    if (!isLoaded || !user) return
    const email = user.primaryEmailAddress?.emailAddress || ''
    const name  = user.fullName || user.firstName || 'User'
    syncUser(email, name).catch(() => {})
  }, [isLoaded, user])
  return null
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <UserSync />
        <div style={{
          height: '100vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-page)',
        }}>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={
              <>
                <SignedIn><Navigate to="/dashboard" replace /></SignedIn>
                <SignedOut><Landing /></SignedOut>
              </>
            } />

            {/* Protected app routes — all use same Navbar */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Navbar />
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/applied" element={
              <ProtectedRoute>
                <Navbar />
                <Applied />
              </ProtectedRoute>
            } />
            <Route path="/skipped" element={
              <ProtectedRoute>
                <Navbar />
                <Skipped />
              </ProtectedRoute>
            } />
            <Route path="/stats" element={
              <ProtectedRoute>
                <Navbar />
                <Stats />
              </ProtectedRoute>
            } />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#fff',
              border: '1px solid #e4e8f4',
              borderLeft: '4px solid #6366f1',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              color: '#1e2640',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
            },
          }}
        />
      </BrowserRouter>
    </ClerkProvider>
  )
}