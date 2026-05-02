import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import employeesRouter from './routes/employees.js';
import onboardingsRouter from './routes/onboardings.js';
import usersRouter from './routes/users.js';
import shiftsRouter from './routes/shifts.js';
import tradesRouter from './routes/trades.js';
import emailRouter from './routes/email.js';
import pool from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Make database pool available to routes
app.set('db', pool);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/onboardings', onboardingsRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/email', emailRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Onboarding Tracker API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
      employees: '/api/employees',
      onboardings: '/api/onboardings',
      shifts: '/api/shifts',
      trades: '/api/trades'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, async () => {
  // Test email connection on startup
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const { EmailService } = await import('./services/emailService.js');
      console.log('Testing email service connection...');
      const result = await EmailService.sendEmail({
        to: process.env.SMTP_USER,
        subject: 'Server Started',
        body: `Onboarding Tracker API server started at ${new Date().toISOString()}`
      });
      if (result.success) {
        console.log('Email service connection verified');
      } else {
        console.warn('Email service verification failed:', result.error);
      }
    } catch (error) {
      console.error('Error during email service verification:', error);
    }
  }

  console.log(`
╔════════════════════════════════════════════════╗
║   Onboarding Tracker API Server               ║
║   Server running on http://localhost:${PORT}    ║
║   Environment: ${process.env.NODE_ENV || 'development'}                   ║
╚════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});
