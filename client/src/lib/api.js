import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach Clerk token to every request automatically
api.interceptors.request.use(async (config) => {
  try {
    // window.Clerk is available globally after ClerkProvider loads
    const token = await window.Clerk?.session?.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (e) {
    // not logged in — request proceeds without token
  }
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────
export const syncUser = (email, name) =>
  api.post('/auth/sync', { email, name })

export const getMe = () => api.get('/auth/me')

// ── Resume ────────────────────────────────────────────────────────────────
export const uploadResume = (formData, onUploadProgress) =>
  api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
    timeout: 300000, // 5 min
  })

export const getActiveResume  = ()  => api.get('/resume/me')
export const getResumeHistory = ()  => api.get('/resume/history')

// ── Jobs ──────────────────────────────────────────────────────────────────
// Fetch new jobs — pass searchMode + optional manualQuery
export const fetchJobs = (searchMode = 'resume', manualQuery = '') =>
  api.post('/jobs/fetch', { searchMode, manualQuery }, { timeout: 300000 })

// Get job queue with filters
export const getJobs = (filters = {}) =>
  api.get('/jobs', { params: filters })

export const getAppliedJobs  = () => api.get('/jobs/applied')
export const getSkippedJobs  = () => api.get('/jobs/skipped')
export const getStats        = () => api.get('/jobs/stats')
export const getFetchHistory = () => api.get('/jobs/fetch-history')

export const applyJob  = (id) => api.patch(`/jobs/${id}/apply`)
export const skipJob   = (id) => api.patch(`/jobs/${id}/skip`)
export const unskipJob = (id) => api.patch(`/jobs/${id}/unskip`)