import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AlertBanner from '../../components/ui/AlertBanner'
import StatusBadge from '../../components/ui/StatusBadge'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import SectionDivider from '../../components/ui/SectionDivider'
import { getExpense } from '../../api/expenses'
import useSessionStore from '../../store/useSessionStore'
import { formatMXN, CATEGORY_LABELS, DEDUCTION_KIND_LABELS } from '../../utils/format'

export default function ExpenseResultPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { sessionId } = useSessionStore()
  const [expense, setExpense] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getExpense(sessionId, id)
      .then(data => setExpense(data.expense || data))
      .catch(err => setError(err.response?.data?.error || 'No se pudo cargar el resultado del gasto.'))
      .finally(() => setLoading(false))
  }, [sessionId, id])

  if (loading) return <LoadingSpinner message="Cargando resultado…" />

  if (error) {
    return (
      <AppLayout>
        <PageHeader title="Resultado del Gasto" />
        <AlertBanner type="error" message={error} />
        <div className="mt-4">
          <SecondaryButton label="← Volver a gastos" onClick={() => navigate('/app/expenses')} />
        </div>
      </AppLayout>
    )
  }

  const result = expense?.evaluationResult || {}
  const isApproved = result.deductibleForISR
  const categoryLabel = CATEGORY_LABELS[expense?.category] || expense?.category || 'Gasto'

  console.log("=== ExpenseResultPage ===");
  console.log("expense = ", expense);
  console.log("result = ", result);

  return (
    <AppLayout>
      <PageHeader
        title="Resultado de Deducibilidad"
        subtitle={categoryLabel}
        breadcrumb={[{ label: 'Gastos', href: '/app/expenses' }, { label: 'Resultado' }]}
      />

      {/* Main result card */}
      <div className={`rounded-2xl p-6 mb-5 ${isApproved ? 'bg-surface-m1' : 'bg-red-50 border border-red-100'}`}>
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge
            status={isApproved ? 'APROBADO' : 'RECHAZADO'}
            label={isApproved ? 'DEDUCIBLE ✅' : 'NO DEDUCIBLE ❌'}
            size="lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-secondary mb-1">Monto del gasto</p>
            <p className="text-lg font-bold text-text-primary">{formatMXN(expense?.amountMXN)}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-1">Monto deducible</p>
            <p className={`text-lg font-bold ${isApproved ? 'text-primary' : 'text-status-error'}`}>
              {formatMXN(result.deductibleAmountMXN || 0)}
            </p>
          </div>
          {isApproved && result.deductiblePercentageOverExpense !== undefined && (
            <div>
              <p className="text-xs text-text-secondary mb-1">Porcentaje deducible</p>
              <p className="text-base font-semibold text-text-primary">
                {(result.deductiblePercentageOverExpense * 100).toFixed(0)}% del gasto
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-secondary mb-1">Tipo de deducción</p>
            <p className="text-sm font-semibold text-text-primary">
              {DEDUCTION_KIND_LABELS[result.deductionKind] || result.deductionKind || '—'}
            </p>
          </div>
        </div>

        {/* Cap description */}
        {result.capAppliedDescription && (
          <p className="mt-4 text-xs text-text-secondary italic">{result.capAppliedDescription}</p>
        )}
      </div>

      {/* Rejection reasons */}
      {!isApproved && result.reasons?.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-text-primary mb-2">Razones de rechazo:</p>
          <div className="flex flex-wrap gap-2">
            {result.reasons.map((r, i) => (
              <span key={i} className="text-xs bg-red-50 text-status-error border border-red-200 px-3 py-1 rounded-full">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings?.length > 0 && (
        <div className="mb-4 space-y-2">
          {result.warnings.map((w, i) => (
            <AlertBanner key={i} type="warning" message={w} />
          ))}
        </div>
      )}

      {/* Missing data */}
      {result.missingData?.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-text-primary mb-2">Datos faltantes:</p>
          <div className="flex flex-wrap gap-2">
            {result.missingData.map((d, i) => (
              <span key={i} className="text-xs bg-blue-50 text-status-info border border-blue-200 px-3 py-1 rounded-full">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Official notes */}
      {result.officialSourceNotes?.length > 0 && (
        <>
          <SectionDivider label="Fuentes oficiales" />
          <div className="space-y-1 mb-5">
            {result.officialSourceNotes.map((note, i) => (
              <p key={i} className="text-xs text-text-secondary">{note}</p>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <PrimaryButton label="Agregar otro gasto" onClick={() => navigate('/app/expenses/new')} className="flex-1" />
        <SecondaryButton label="Editar este gasto" onClick={() => navigate(`/app/expenses/${id}/edit`)} />
        <SecondaryButton label="Ver todos mis gastos" onClick={() => navigate('/app/expenses')} />
      </div>
    </AppLayout>
  )
}
