import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AlertBanner from '../../components/ui/AlertBanner'
import PrimaryButton from '../../components/ui/PrimaryButton'
import StatusBadge from '../../components/ui/StatusBadge'
import { getDeductionCatalog } from '../../api/deductions'
import useSessionStore from '../../store/useSessionStore'
import { OBLIGATION_LABELS } from '../../utils/format'

const FAMILY_CONFIG = {
  PERSONAL_DEDUCTIONS:    { icon: '🏥', label: 'Deducciones Personales' },
  BUSINESS_DEDUCTIONS_ISR:{ icon: '💼', label: 'Gastos de tu Actividad (ISR)' },
  ARR_DEDUCTIONS_ISR:     { icon: '🏠', label: 'Gastos de Arrendamiento (ISR)' },
  RESICO_ISR:             { icon: '⚠️', label: 'Régimen RESICO — Sin deducción de gastos' },
}

function CatalogSection({ family, items }) {
  const [open, setOpen] = useState(true)
  const cfg = FAMILY_CONFIG[family] || { icon: '📋', label: family }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-gray transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="font-semibold text-text-primary">
          {cfg.icon} {cfg.label}
        </span>
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {items.map((item, i) => (
            <div key={i} className="px-5 py-3">
              <p className="text-sm font-medium text-text-primary">{item.item}</p>
              {item.rule && <p className="text-xs text-text-secondary mt-0.5">{item.rule}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DeductionCatalogPage() {
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const [catalog, setCatalog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDeductionCatalog(sessionId)
      .then(data => setCatalog(data))
      .catch(err => setError(err.response?.data?.error || 'Error al cargar el catálogo. Asegúrate de haber identificado tu régimen.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <LoadingSpinner message="Cargando catálogo de deducciones…" />

  // Group by family
  const grouped = {}
  catalog?.catalog?.forEach(item => {
    if (!grouped[item.family]) grouped[item.family] = []
    grouped[item.family].push(item)
  })

  return (
    <AppLayout>
      <PageHeader
        title="Catálogo de Deducciones"
        subtitle="Estas son las deducciones disponibles según tus obligaciones fiscales."
        breadcrumb={[{ label: 'Gastos', href: '/app/expenses' }, { label: 'Catálogo' }]}
      />

      {error && <AlertBanner type="error" message={error} />}

      {!error && catalog && (
        <>
          {/* Active obligations chips */}
          {catalog.obligations?.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="text-xs text-text-secondary font-medium self-center">Tu régimen:</span>
              {catalog.obligations.map(obl => (
                <StatusBadge key={obl} status="INFO" label={OBLIGATION_LABELS[obl] || obl} />
              ))}
            </div>
          )}

          {Object.entries(grouped).map(([family, items]) => (
            <CatalogSection key={family} family={family} items={items} />
          ))}

          <div className="mt-6">
            <PrimaryButton
              label="Empezar a registrar gastos →"
              onClick={() => navigate('/app/expenses')}
              className="w-full sm:w-auto"
            />
          </div>
        </>
      )}
    </AppLayout>
  )
}
