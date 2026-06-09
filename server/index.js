require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const { clerkMiddleware, requireAuth, getAuth } = require('@clerk/express');
const { initDB } = require('./db');
const resumeRoutes        = require('./routes/resume');
const jobRoutes           = require('./routes/jobs');
const authRoutes          = require('./routes/auth');
const dashboardRoutes     = require('./routes/dashboard');
const optimizationsRoutes = require('./routes/optimizations');
const paymentRoutes       = require('./routes/payment');
const adminRoutes         = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Clerk middleware — attaches auth to every request
// req.auth.userId is available on all routes after this
app.use(clerkMiddleware());

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/resume',        resumeRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/optimizations', optimizationsRoutes);
app.use('/api/payment',       paymentRoutes);
app.use('/api/admin',         adminRoutes);
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
}).catch(err => {
  console.error('❌ DB init failed:', err.message);
  process.exit(1);
});