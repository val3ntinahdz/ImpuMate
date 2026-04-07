import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AlertBanner from '../../components/ui/AlertBanner'
import BigNumberCard from '../../components/ui/BigNumberCard'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import SectionDivider from '../../components/ui/SectionDivider'
import { getDeductionsSummary } from '../../api/deductions'
import useSessionStore from '../../store/useSessionStore'
import { formatMXN, formatDate, CATEGORY_LABELS, DEDUCTION_KIND_LABELS } from '../../utils/format'

export default function DeductionsSummaryPage() {
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDeductionsSummary(sessionId)
      .then(data => setSummary(data))
      .catch(err => setError(err.response?.data?.error || 'Error al cargar el resumen.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <LoadingSpinner message="Calculando deducciones…" />

  return (
    <AppLayout>
      <PageHeader
        title="Resumen de Deducciones"
        subtitle="Acumulador consolidado de todos tus gastos aprobados."
        breadcrumb={[{ label: 'Gastos', href: '/app/expenses' }, { label: 'Resumen' }]}
      />

      {error && <AlertBanner type="error" message={error} />}

      {summary && (
        <>
          <BigNumberCard
            amount={summary.totalDeductiblesMxn}
            label="Total deducible acumulado"
            sublabel={`Actualizado: ${formatDate(summary.lastRecalculatedAt)}`}
            bgColor="bg-primary"
            textColor="text-white"
            className="mb-5"
          />

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-surface-m1 rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-1">Deducciones personales</p>
              <p className="text-lg font-bold text-primary">{formatMXN(summary.totalPersonalDeductiblesMxn)}</p>
            </div>
            <div className="bg-surface-m2 rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-1">Deducciones de actividad</p>
              <p className="text-lg font-bold text-orange-700">{formatMXN(summary.totalActivityDeductiblesMxn)}</p>
            </div>
            <div className="bg-surface-m3 rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-1">IVA acreditable estimado</p>
              <p className="text-lg font-bold text-secondary">{formatMXN(summary.totalIvaAcreditableMxn)}</p>
              <p className="text-xs text-text-secondary mt-1">Reducirá tu IVA pendiente</p>
            </div>
          </div>

          {/* Counts */}
          <div className="flex gap-4 mb-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 bg-status-success rounded-full"></span>
              <span className="font-semibold text-status-success">{summary.approvedCount}</span>
              <span className="text-text-secondary">gastos aprobados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 bg-status-error rounded-full"></span>
              <span className="font-semibold text-status-error">{summary.rejectedCount}</span>
              <span className="text-text-secondary">gastos rechazados</span>
              {summary.rejectedCount > 0 && (
                <button
                  onClick={() => navigate('/app/expenses')}
                  className="text-xs text-primary underline"
                >
                  ver
                </button>
              )}
            </div>
          </div>

          {/* Approved list */}
          {summary.approvedExpenses?.length > 0 && (
            <>
              <SectionDivider label="Gastos aprobados" />
              <div className="space-y-2 mb-5">
                {summary.approvedExpenses.map((exp, i) => (
                  <div key={i} className="flex justify-between items-center bg-white rounded-lg border border-gray-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {DEDUCTION_KIND_LABELS[exp.deductionKind] || exp.deductionKind}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-primary">{formatMXN(exp.deductibleAmountMxn)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Rejected list */}
          {summary.rejectedExpenses?.length > 0 && (
            <>
              <SectionDivider label="Gastos rechazados" />
              <div className="space-y-2 mb-5">
                {summary.rejectedExpenses.map((exp, i) => (
                  <div key={i} className="flex justify-between items-start bg-red-50 rounded-lg border border-red-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {exp.reasons?.map((r, j) => (
                          <span key={j} className="text-xs text-status-error">{r}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-status-error">{formatMXN(0)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <PrimaryButton label="Calcular mi buffer mensual →" onClick={() => navigate('/app/buffer')} className="flex-1" />
            <SecondaryButton label="Agregar más gastos" onClick={() => navigate('/app/expenses/new')} />
          </div>
        </>
      )}
    </AppLayout>
  )
}
