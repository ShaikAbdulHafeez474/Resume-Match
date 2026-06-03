import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Optimizations from './pages/Optimizations'
import OptimizationDetail from './pages/OptimizationDetail'
import Resume from './pages/Resume'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import TailorResume from './pages/TailorResume'
import { syncUser } from './lib/api'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

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

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Navbar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <UserSync />
        <Routes>
          {/* Root — Dashboard if signed in, Landing if not */}
          <Route path="/" element={
            <>
              <SignedIn>
                <AppLayout><Dashboard /></AppLayout>
              </SignedIn>
              <SignedOut><Landing /></SignedOut>
            </>
          } />

          {/* Legacy redirect */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Jobs workspace */}
          <Route path="/jobs" element={
            <ProtectedRoute><AppLayout><Jobs /></AppLayout></ProtectedRoute>
          } />

          {/* Optimizations */}
          <Route path="/optimizations" element={
            <ProtectedRoute><AppLayout><Optimizations /></AppLayout></ProtectedRoute>
          } />
          <Route path="/optimizations/:id" element={
            <ProtectedRoute><AppLayout><OptimizationDetail /></AppLayout></ProtectedRoute>
          } />

          {/* Resume management */}
          <Route path="/resume" element={
            <ProtectedRoute><AppLayout><Resume /></AppLayout></ProtectedRoute>
          } />

          {/* Insights */}
          <Route path="/insights" element={
            <ProtectedRoute><AppLayout><Insights /></AppLayout></ProtectedRoute>
          } />

          {/* Settings */}
          <Route path="/settings" element={
            <ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>
          } />

          {/* TailorResume — kept for backward compat, full page no sidebar */}
          <Route path="/tailor/:jobId" element={<ProtectedRoute><TailorResume /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#fff', border: '1px solid #e4e8f4',
            borderLeft: '4px solid #6366f1', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', color: '#1e2640',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600,
          },
        }} />
      </BrowserRouter>
    </ClerkProvider>
  )
}
