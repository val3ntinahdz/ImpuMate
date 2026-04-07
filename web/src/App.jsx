import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'
import useSessionStore from './store/useSessionStore'

// Auth pages
import WelcomePage from './pages/auth/WelcomePage'
import RegisterPage from './pages/auth/RegisterPage'
import LoginPage from './pages/auth/LoginPage'
import SatProfilePage from './pages/auth/SatProfilePage'

// Session pages
import SessionListPage from './pages/sessions/SessionListPage'
import SessionNewPage from './pages/sessions/SessionNewPage'

// App pages (require sessionId)
import DashboardPage from './pages/dashboard/DashboardPage'

// Regime pages
import RegimePage from './pages/regime/RegimePage'
import IncomeSourcesPage from './pages/regime/IncomeSourcesPage'
import IncomeSourceFormPage from './pages/regime/IncomeSourceFormPage'
import RegimeResultPage from './pages/regime/RegimeResultPage'

// Expense pages
import ExpensesPage from './pages/expenses/ExpensesPage'
import DeductionCatalogPage from './pages/expenses/DeductionCatalogPage'
import ExpenseNewPage from './pages/expenses/ExpenseNewPage'
import ExpenseFormPage from './pages/expenses/ExpenseFormPage'
import ExpenseResultPage from './pages/expenses/ExpenseResultPage'
import DeductionsSummaryPage from './pages/expenses/DeductionsSummaryPage'
import DirectoryPage from './pages/expenses/DirectoryPage'

// Buffer pages
import BufferPage from './pages/buffer/BufferPage'
import BufferResultPage from './pages/buffer/BufferResultPage'

// Profile
import ProfilePage from './pages/profile/ProfilePage'

function RequireAuth({ children }) {
  const { userId } = useAuthStore()
  if (!userId) return <Navigate to="/login" replace />
  return children
}

function RequireSession({ children }) {
  const { userId } = useAuthStore()
  const { sessionId } = useSessionStore()
  if (!userId) return <Navigate to="/login" replace />
  if (!sessionId) return <Navigate to="/sessions" replace />
  return children
}

function RootRedirect() {
  const { userId } = useAuthStore()
  const { sessionId } = useSessionStore()
  if (!userId) return <Navigate to="/login" replace />
  if (!sessionId) return <Navigate to="/sessions" replace />
  return <Navigate to="/app/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public auth routes */}
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Post-register setup */}
        <Route path="/setup" element={
          <RequireAuth><SatProfilePage /></RequireAuth>
        } />

        {/* Session management */}
        <Route path="/sessions" element={
          <RequireAuth><SessionListPage /></RequireAuth>
        } />
        <Route path="/sessions/new" element={
          <RequireAuth><SessionNewPage /></RequireAuth>
        } />

        {/* App routes (require sessionId) */}
        <Route path="/app/dashboard" element={
          <RequireSession><DashboardPage /></RequireSession>
        } />

        {/* Regime module */}
        <Route path="/app/regime" element={
          <RequireSession><RegimePage /></RequireSession>
        } />
        <Route path="/app/regime/sources" element={
          <RequireSession><IncomeSourcesPage /></RequireSession>
        } />
        <Route path="/app/regime/sources/new" element={
          <RequireSession><IncomeSourceFormPage /></RequireSession>
        } />
        <Route path="/app/regime/sources/:id" element={
          <RequireSession><IncomeSourceFormPage /></RequireSession>
        } />
        <Route path="/app/regime/result" element={
          <RequireSession><RegimeResultPage /></RequireSession>
        } />

        {/* Expenses module */}
        <Route path="/app/expenses" element={
          <RequireSession><ExpensesPage /></RequireSession>
        } />
        <Route path="/app/expenses/catalog" element={
          <RequireSession><DeductionCatalogPage /></RequireSession>
        } />
        <Route path="/app/expenses/new" element={
          <RequireSession><ExpenseNewPage /></RequireSession>
        } />
        <Route path="/app/expenses/new/:category" element={
          <RequireSession><ExpenseFormPage /></RequireSession>
        } />
        <Route path="/app/expenses/:id" element={
          <RequireSession><ExpenseResultPage /></RequireSession>
        } />
        <Route path="/app/expenses/:id/edit" element={
          <RequireSession><ExpenseFormPage /></RequireSession>
        } />
        <Route path="/app/expenses/summary" element={
          <RequireSession><DeductionsSummaryPage /></RequireSession>
        } />
        <Route path="/app/expenses/directory" element={
          <RequireSession><DirectoryPage /></RequireSession>
        } />

        {/* Buffer module */}
        <Route path="/app/buffer" element={
          <RequireSession><BufferPage /></RequireSession>
        } />
        <Route path="/app/buffer/result" element={
          <RequireSession><BufferResultPage /></RequireSession>
        } />

        {/* Profile */}
        <Route path="/app/profile" element={
          <RequireSession><ProfilePage /></RequireSession>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
