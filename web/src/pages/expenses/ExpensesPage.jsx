import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import EmptyState from '../../components/ui/EmptyState'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AlertBanner from '../../components/ui/AlertBanner'
import StatusBadge from '../../components/ui/StatusBadge'
import BigNumberCard from '../../components/ui/BigNumberCard'
import { getExpenses, deleteExpense } from '../../api/expenses'
import { getDeductionsSummary } from '../../api/deductions'
import useSessionStore from '../../store/useSessionStore'
import { formatMXN, formatDate, CATEGORY_LABELS, DEDUCTION_KIND_LABELS } from '../../utils/format'

const FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Aprobados', value: 'approved' },
  { label: 'Rechazados', value: 'rejected' },
]

function ExpenseCard({ expense, onTap, onDelete }) {
  const evalResult = expense.evaluationResult || {}
  const isApproved = evalResult.deductibleForISR

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
      onClick={() => onTap(expense)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary text-sm truncate">
            {CATEGORY_LABELS[expense.category] || expense.category}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {DEDUCTION_KIND_LABELS[evalResult.deductionKind] || evalResult.deductionKind || '—'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-bold text-text-primary">{formatMXN(expense.amountMXN)}</span>
            {isApproved && evalResult.deductibleAmountMXN !== expense.amountMXN && (
              <span className="text-xs text-accent">→ deducible: {formatMXN(evalResult.deductibleAmountMXN)}</span>
            )}
          </div>
          {evalResult.capAppliedDescription && (
            <p className="text-xs text-text-secondary italic mt-1 line-clamp-1">{evalResult.capAppliedDescription}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={isApproved ? 'APROBADO' : 'RECHAZADO'} />
          <button
            onClick={e => { e.stopPropagation(); onDelete(expense.id) }}
            className="p-1 text-text-secondary hover:text-status-error transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getExpenses(sessionId),
      getDeductionsSummary(sessionId).catch(() => null),
    ])
      .then(([exps, sum]) => {
        setExpenses(exps || [])
        setSummary(sum)
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar gastos.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (expenseId) => {
    if (!window.confirm('¿Eliminar este gasto?')) return
    try {
      await deleteExpense(sessionId, expenseId)
      load()
    } catch {
      setError('Error al eliminar el gasto.')
    }
  }

  const filtered = expenses.filter(e => {
    if (filter === 'approved') return e.evaluationResult?.deductibleForISR
    if (filter === 'rejected') return !e.evaluationResult?.deductibleForISR
    return true
  })

  if (loading) return <LoadingSpinner message="Cargando gastos…" />

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Gastos y Deducciones" subtitle="Registra y evalúa la deducibilidad de tus gastos." />
        <div className="flex gap-2">
          <SecondaryButton label="Catálogo" onClick={() => navigate('/app/expenses/catalog')} />
          <SecondaryButton label="Directorio" onClick={() => navigate('/app/expenses/directory')} />
          <PrimaryButton label="+ Agregar gasto" onClick={() => navigate('/app/expenses/new')} />
        </div>
      </div>

      {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

      {/* Summary panel */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <BigNumberCard
            amount={summary.totalDeductiblesMxn}
            label="Total deducible"
            bgColor="bg-primary"
            textColor="text-white"
            className="col-span-2"
          />
          <div className="bg-surface-m1 rounded-xl p-4">
            <p className="text-xs text-text-secondary mb-1">Deducciones personales</p>
            <p className="text-lg font-bold text-primary">{formatMXN(summary.totalPersonalDeductiblesMxn)}</p>
          </div>
          <div className="bg-surface-m2 rounded-xl p-4">
            <p className="text-xs text-text-secondary mb-1">Deducciones de actividad</p>
            <p className="text-lg font-bold text-orange-700">{formatMXN(summary.totalActivityDeductiblesMxn)}</p>
          </div>
          <div className="bg-surface-m3 rounded-xl p-4">
            <p className="text-xs text-text-secondary mb-1">IVA acreditable</p>
            <p className="text-lg font-bold text-secondary">{formatMXN(summary.totalIvaAcreditableMxn)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-text-secondary mb-1">Aprobados / Rechazados</p>
            <p className="text-lg font-bold text-text-primary">
              <span className="text-status-success">{summary.approvedCount}</span>
              <span className="text-text-secondary"> / </span>
              <span className="text-status-error">{summary.rejectedCount}</span>
            </p>
          </div>
          {summary.lastRecalculatedAt && (
            <div className="col-span-2 text-right text-xs text-text-secondary self-end">
              Último cálculo: {formatDate(summary.lastRecalculatedAt)}
            </div>
          )}
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          title="Sin gastos registrados"
          subtitle="Agrega tus gastos para evaluar cuáles son deducibles."
          ctaLabel="Agregar primer gasto"
          onCta={() => navigate('/app/expenses/new')}
        />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 mb-4 bg-surface-gray rounded-lg p-1 w-fit">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === f.value ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map(exp => (
              <ExpenseCard
                key={exp.id}
                expense={exp}
                onTap={e => navigate(`/app/expenses/${e.id}`)}
                onDelete={handleDelete}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-text-secondary text-sm py-8">
                No hay gastos {filter === 'approved' ? 'aprobados' : 'rechazados'}.
              </p>
            )}
          </div>

          <div className="mt-6">
            <SecondaryButton
              label="Ver resumen de deducciones →"
              onClick={() => navigate('/app/expenses/summary')}
              className="w-full"
            />
          </div>
        </>
      )}

      {expenses.length > 0 && (
        <div className="mt-4">
          <PrimaryButton
            label="Ver mi fondo para impuestos"
            onClick={() => navigate('/app/buffer')}
            className="w-full"
          />
        </div>
      )}
    </AppLayout>
  )
}
