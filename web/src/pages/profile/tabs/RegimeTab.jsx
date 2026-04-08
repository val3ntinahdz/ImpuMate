import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import AlertBanner from '../../../components/ui/AlertBanner'
import StatusBadge from '../../../components/ui/StatusBadge'
import PrimaryButton from '../../../components/ui/PrimaryButton'
import SecondaryButton from '../../../components/ui/SecondaryButton'
import SectionDivider from '../../../components/ui/SectionDivider'
import { getRegimeResults } from '../../../api/regime'
import useSessionStore from '../../../store/useSessionStore'
import { OBLIGATION_LABELS } from '../../../utils/format'

const CATEGORIA_LABELS = {
  SUELDOS_Y_SALARIOS: 'Sueldos y Salarios',
  ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL: 'Actividad Empresarial',
  SERVICIOS_PROFESIONALES_REGIMEN_GENERAL: 'Servicios Profesionales',
  ARRENDAMIENTO_REGIMEN_GENERAL: 'Arrendamiento',
  ACTIVIDAD_EMPRESARIAL_RESICO: 'Actividad Empresarial RESICO',
  SERVICIOS_PROFESIONALES_RESICO: 'Servicios Profesionales RESICO',
  ARRENDAMIENTO_RESICO: 'Arrendamiento RESICO',
}

function ObligationCard({ obl }) {
  const isResico = obl.categoriaFiscal?.includes('RESICO')
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <StatusBadge
            status={isResico ? 'RESICO' : 'INFO'}
            label={CATEGORIA_LABELS[obl.categoriaFiscal] || obl.categoriaFiscal}
            size="lg"
          />
        </div>
      </div>

      {obl.motivoDeteccion && (
        <p className="text-sm text-text-secondary mb-3 italic">"{obl.motivoDeteccion}"</p>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        {obl.impuestosAplicables?.length > 0 && (
          <div>
            <p className="text-text-secondary font-medium mb-1">Impuestos</p>
            <p className="font-semibold text-text-primary">{obl.impuestosAplicables.join(', ')}</p>
          </div>
        )}
        {obl.periodicidadISR && (
          <div>
            <p className="text-text-secondary font-medium mb-1">Periodicidad ISR</p>
            <p className="font-semibold text-text-primary">{obl.periodicidadISR}</p>
          </div>
        )}
        {obl.periodicidadIVA && (
          <div>
            <p className="text-text-secondary font-medium mb-1">Periodicidad IVA</p>
            <p className="font-semibold text-text-primary">{obl.periodicidadIVA}</p>
          </div>
        )}
        {obl.requiereDeclaracionAnual !== undefined && (
          <div>
            <p className="text-text-secondary font-medium mb-1">Declaración anual</p>
            <p className="font-semibold text-text-primary">{obl.requiereDeclaracionAnual ? 'Sí' : 'No'}</p>
          </div>
        )}
      </div>

      {obl.datosMinimosFaltantes?.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-status-warning mb-1">Datos faltantes:</p>
          <div className="flex flex-wrap gap-1">
            {obl.datosMinimosFaltantes.map((d, i) => (
              <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">{d}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RegimeTab() {
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getRegimeResults(sessionId)
      .then(data => setResult(data))
      .catch(err => setError(err.response?.data?.error || 'No se encontró un resultado de régimen. Ejecuta el identificador primero.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return <LoadingSpinner message="Cargando resultado del régimen…" />

  if (error) {
    return (
      <div>
        <AlertBanner type="error" message={error} />
        <div className="mt-4">
          <SecondaryButton
            label="← Ir a fuentes de ingreso"
            onClick={() => navigate('/app/profile?tab=sources')}
          />
        </div>
      </div>
    )
  }

  const summary = result?.executiveSummary || {}
  const obligations = result?.obligationsDetected || []
  const alerts = result?.inconsistencyAlerts || []
  const missing = result?.globalMissingData || []
  const nextSteps = result?.recommendedNextSteps || []

  return (
    <div>
      <div className="bg-surface-m1 rounded-xl p-5 mb-6">
        <p className="text-lg font-bold text-primary">
          {summary.totalObligaciones === 1
            ? 'Tienes 1 obligación fiscal activa'
            : `Tienes ${summary.totalObligaciones || 0} obligaciones fiscales activas`}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {summary.tieneRESICO && <StatusBadge status="RESICO" label="RESICO" />}
          {summary.tieneSueldos && <StatusBadge status="INFO" label="Sueldos y Salarios" />}
          {summary.tieneActividadPorCuentaPropia && <StatusBadge status="INFO" label="Cuenta propia" />}
        </div>
      </div>

      {result?.requiresSATUpdateNotice && (
        <div className="mb-4">
          <AlertBanner type="error" message="Necesitas presentar aviso de actualización ante el SAT. Tu situación fiscal registrada no coincide con las obligaciones detectadas." />
        </div>
      )}

      {alerts.map((alert, i) => (
        <div key={i} className="mb-3">
          <AlertBanner type="warning" message={typeof alert === 'string' ? alert : alert.message || JSON.stringify(alert)} />
        </div>
      ))}

      <SectionDivider label="Obligaciones detectadas" />
      <div className="space-y-4 mb-6">
        {obligations.map((obl, i) => (
          <ObligationCard key={i} obl={obl} />
        ))}
      </div>

      {missing.length > 0 && (
        <div className="mb-4">
          <AlertBanner
            type="info"
            message={`Para mayor precisión, proporciona: ${missing.join(', ')}`}
          />
        </div>
      )}

      {nextSteps.length > 0 && (
        <>
          <SectionDivider label="Pasos siguientes" />
          <ol className="space-y-2 mb-6">
            {nextSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-text-primary">
                <span className="w-6 h-6 bg-accent text-primary rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</span>
                <span>{typeof step === 'string' ? step : step.descripcion || JSON.stringify(step)}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="flex gap-3">
        <PrimaryButton
          label="Ver qué puedo deducir →"
          onClick={() => navigate('/app/expenses/catalog')}
          className="flex-1"
        />
        <SecondaryButton
          label="Corregir fuentes"
          onClick={() => navigate('/app/profile?tab=sources')}
        />
      </div>
    </div>
  )
}
