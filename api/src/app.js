'use strict';

const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const helmet  = require('helmet');

const authRoutes            = require('./routes/auth.routes');
const profileRoutes         = require('./routes/profile.routes');
const fiscalSessionRoutes   = require('./routes/fiscalSession.routes');
const incomeSourceRoutes    = require('./routes/incomeSource.routes');
const regimeRoutes          = require('./routes/regime.routes');
const expenseRoutes         = require('./routes/expense.routes');
const deductionCatalogRoutes = require('./routes/deductionCatalog.routes');
const deductionsSummaryRoutes = require('./routes/deductionsSummary.routes');
const taxBufferRoutes       = require('./routes/taxBuffer.routes');

const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Security & parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Session ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'impumate-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/profile',         profileRoutes);
app.use('/api/fiscal-sessions', fiscalSessionRoutes);

// Nested under /api/fiscal-sessions/:sessionId
app.use('/api/fiscal-sessions/:sessionId/income-sources',   incomeSourceRoutes);
app.use('/api/fiscal-sessions/:sessionId/regime',           regimeRoutes);
app.use('/api/fiscal-sessions/:sessionId/expenses',         expenseRoutes);
app.use('/api/fiscal-sessions/:sessionId/deduction-catalog', deductionCatalogRoutes);
app.use('/api/fiscal-sessions/:sessionId/deductions',       deductionsSummaryRoutes);
app.use('/api/fiscal-sessions/:sessionId/tax-buffer',       taxBufferRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
