# CLAUDE.md

This file provides persistent context for Claude Code working in this repository.

---

## Project Purpose

ImpuMate is a tax advisory web application for Mexican independent workers (freelancers, professionals, and small business owners). It helps users identify their applicable fiscal regime under Mexican tax law (SAT), log deductible expenses, receive real-time deductibility verdicts, and calculate a monthly tax buffer — the amount they should set aside each month to meet their ISR and IVA obligations. The system encodes 2026 Mexican fiscal rules (RESICO, Actividad Empresarial, Servicios Profesionales, Arrendamiento) and enforces correct deduction caps, CFDI requirements, and banked-payment thresholds automatically.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React | 18.2 |
| Frontend build | Vite | 5.0 |
| Frontend routing | React Router DOM | 6.20 |
| Frontend state | Zustand | 4.4 |
| Frontend styles | Tailwind CSS | 3.3 |
| HTTP client | Axios | 1.6 |
| Backend | Node.js | 20.x |
| Backend framework | Express | 5.2 |
| Auth | express-session (session-based, cookie) | 1.19 |
| Database driver | node-postgres (`pg`) | 8.13 |
| Database | PostgreSQL | 14+ |
| Algorithm engine | Pure Node.js (no dependencies) | — |
| Security | Helmet, CORS | latest |

---

## Folder Structure

```
impumate/
├── api/                              # Express REST API
│   ├── build/
│   │   ├── setup-db.sh               # DB create + schema + seed
│   │   └── test-endpoints.sh
│   ├── src/
│   │   ├── app.js                    # Express app: middleware + routes
│   │   ├── server.js                 # HTTP server entry point (port 3000)
│   │   ├── db.js                     # pg Pool singleton
│   │   ├── controllers/              # Route handlers (thin, delegate to services)
│   │   ├── routes/                   # Express Router definitions
│   │   ├── services/                 # Business logic + algorithm wrappers
│   │   └── middlewares/              # requireAuth, errorHandler
│   └── package.json
│
├── integrated-algorithms/            # Canonical tax algorithm engine (no install)
│   ├── runner.js                     # CLI entry point (sections A / B / C)
│   ├── db/
│   │   ├── schema.sql                # PostgreSQL schema
│   │   └── seed_fiscal_parameters.sql
│   └── src/
│       ├── constants/
│       │   ├── fiscalConstants.js    # Single source of truth for fiscal values
│       │   └── taxCatalogs.js        # Enums: obligation types, categories, etc.
│       ├── modules/
│       │   ├── expenseDeductionAdvisor.js   # Stateless deductibility evaluator
│       │   ├── taxBufferCalculator.js       # Stateless ISR + IVA + buffer calc
│       │   └── taxRegimeIdentifier.js       # Regime identification logic
│       └── core/
│           └── deductionsAccumulator.js     # Stateful cap tracker (per fiscal session)
│
└── web/                              # React + Vite frontend
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                   # Route definitions
        ├── api/                      # Axios calls per domain (auth, expenses, etc.)
        ├── components/
        │   ├── layout/               # AppLayout, AuthLayout, Sidebar
        │   └── ui/                   # Reusable primitives (Button, InputField, etc.)
        ├── hooks/                    # useApi, useCategoryFields
        ├── pages/                    # Feature pages grouped by domain
        │   ├── auth/
        │   ├── regime/
        │   ├── expenses/
        │   ├── buffer/
        │   ├── dashboard/
        │   ├── profile/
        │   └── sessions/
        ├── store/                    # Zustand stores (useAuthStore, useSessionStore)
        ├── public/
        │   └── impumate-logo.png     # App logo — do not rename or relocate
        └── utils/
            └── format.js
```

---

## Branding Tokens

These tokens define the visual identity. Apply them consistently; do not introduce ad-hoc hex values in component code.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#1A3A5C` | Primary actions, nav active states, headings |
| `secondary` | `#2562A8` | Secondary buttons, links, hover states |
| `accent` | `#00897B` | Success states, positive indicators, CTAs |
| `appBg` | `#F1F8F6` | Page background |
| `textPrimary` | `#212121` | Body text, labels |

### Typography

- **Font family**: Plus Jakarta Sans
- **Weights in use**: Regular (400), Medium (500), SemiBold (600)
- Load via Google Fonts or a self-hosted woff2. Apply as `font-sans` in Tailwind by extending `fontFamily`.

### Logo

- Path: `web/src/public/impumate-logo.png`
- Do not rename, move, or replace without updating every import site.

---

## Key Architectural Decisions

### Authentication
- Session-based (not JWT). `express-session` stores session state server-side.
- Cookie is `httpOnly`, `secure` in production, 8-hour TTL.
- All protected routes use the `requireAuth` middleware.

### Fiscal Session Flow
A user can have multiple **fiscal sessions** (one per tax year). All domain data (income sources, expenses, regime results, deductions, buffer) is scoped under a session ID. API routes follow the pattern:
```
/api/fiscal-sessions/:sessionId/<resource>
```

### Expense Lifecycle
1. User submits an expense → `POST /expenses`
2. `expenseDeductionAdvisor` evaluates deductibility (stateless)
3. `deductionsAccumulator` applies the global personal deduction cap (stateful, per session)
4. Result is stored; summary is available via `/deductions`

### Tax Buffer Trigger
The buffer is calculated on demand via `GET /tax-buffer`. It reads the current deductions summary and all income sources, then runs `taxBufferCalculator` to produce a monthly MXN figure.

### Algorithm Engine Isolation
`integrated-algorithms/` is a self-contained module with no npm dependencies. The API imports it directly via relative `require()` paths. Never introduce external packages into this directory.

### State Management (Frontend)
- `useAuthStore` (Zustand) — current user, login/logout
- `useSessionStore` (Zustand) — active fiscal session ID
- No Redux; keep state local to stores unless shared across multiple page trees.

---

## What NOT to Change

These modules are stable and encode verified fiscal rules. Do not refactor or extend without a clear fiscal-law justification:

| File | Reason |
|---|---|
| `integrated-algorithms/src/constants/fiscalConstants.js` | Single source of truth for all 2026 fiscal values (UMA, brackets, caps, RESICO rates). Any change has cascading effects on every calculation. |
| `integrated-algorithms/src/modules/expenseDeductionAdvisor.js` | Encodes all SAT deductibility rules. Stateless and well-tested. |
| `integrated-algorithms/src/modules/taxBufferCalculator.js` | ISR tariff + RESICO flat-rate + IVA + safety margin logic. |
| `integrated-algorithms/src/core/deductionsAccumulator.js` | Stateful cap tracker — the order of expense evaluation matters. |
| `api/src/middlewares/requireAuth.js` | Auth guard used across all protected routes. |
| `api/build/setup-db.sh` | Database provisioning script — used by CI and onboarding. |

---

## Current Priorities for New Features

1. **Dashboard summary cards** — aggregate view of total deductible amount, monthly buffer, and regime for the active fiscal session. Already has a `DashboardPage.jsx` scaffold.
2. **Expense list with filters** — `ExpensesPage.jsx` needs filter/sort by category, date range, and deductibility status.
3. **Onboarding flow polish** — the multi-step SAT profile + income source flow (Welcome → Register → SatProfile → IncomeSources → RegimeResult) needs UX review and error-state handling.
4. **Session switching** — allow users to switch between fiscal years without logging out; `useSessionStore` is already wired but the UI picker is missing.
5. **Buffer result page detail** — `BufferResultPage.jsx` should break down the buffer into ISR vs. IVA components and show the safety margin applied.

---

## Running the Project

```bash
# API (port 3000)
cd api && npm run dev

# Web (port 5173)
cd web && npm run dev

# Algorithms (standalone CLI)
cd integrated-algorithms && node runner.js
```

**Database setup (first run):**
```bash
cd api && npm run db:setup
```

See `SETUP.md` for the full step-by-step guide.
