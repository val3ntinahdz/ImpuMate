import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '../../../components/ui/PrimaryButton'
import SecondaryButton from '../../../components/ui/SecondaryButton'
import EmptyState from '../../../components/ui/EmptyState'
import LoadingSpinner from '../../../components/ui/LoadingSpinner'
import AlertBanner from '../../../components/ui/AlertBanner'
import StatusBadge from '../../../components/ui/StatusBadge'
import { getIncomeSources, deleteIncomeSource } from '../../../api/incomeSources'
import { runRegime, selectRegime } from '../../../api/regime'
import useSessionStore from '../../../store/useSessionStore'
import { formatMXN, OBLIGATION_LABELS } from '../../../utils/format'

const OBLIGATION_OPTIONS = Object.entries(OBLIGATION_LABELS).map(([value, label]) => ({ value, label }))

function IncomeSourceCard({ source, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate">
            {source.descripcion || source.tipoEconomico}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {OBLIGATION_LABELS[source.tipoEconomico] || source.tipoEconomico}
          </p>
          {source.montoAnualEstimado > 0 && (
            <p className="text-sm font-semibold text-primary mt-1">
              {formatMXN(source.montoAnualEstimado)} / año
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            {source.isSubjectToIva && <StatusBadge status="INFO" label="Sujeto a IVA" />}
            {source.emiteCFDI && <StatusBadge status="APROBADO" label="Emite CFDI" />}
            {source.clienteRetieneIva && <StatusBadge status="ALERTA" label="Cliente retiene IVA" />}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(source)}
            className="p-1.5 text-text-secondary hover:text-primary transition-colors"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(source.id)}
            className="p-1.5 text-text-secondary hover:text-status-error transition-colors"
            title="Eliminar"
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

export default function IncomeSourcesTab() {
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [showManual, setShowManual] = useState(false)
  const [selectedObligation, setSelectedObligation] = useState('')

  const load = () => {
    setLoading(true)
    getIncomeSources(sessionId)
      .then(data => setSources(data || []))
      .catch(err => setError(err.response?.data?.error || 'Error al cargar fuentes.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [sessionId])

  const handleDelete = async (sourceId) => {
    if (!window.confirm('¿Eliminar esta fuente de ingreso?')) return
    try {
      await deleteIncomeSource(sessionId, sourceId)
      load()
    } catch {
      setError('Error al eliminar la fuente.')
    }
  }

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    try {
      await runRegime(sessionId)
      navigate('/app/profile?tab=regime')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al identificar el régimen.')
    } finally {
      setRunning(false)
    }
  }

  const handleManualSelect = async () => {
    if (!selectedObligation) return
    setRunning(true)
    try {
      await selectRegime(sessionId, [selectedObligation])
      navigate('/app/profile?tab=regime')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al asignar el régimen.')
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando fuentes de ingreso…" />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-text-secondary">Administra cómo obtienes tus ingresos.</p>
        </div>
        <PrimaryButton label="+ Agregar fuente" onClick={() => navigate('/app/regime/sources/new')} />
      </div>

      {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

      {sources.length === 0 ? (
        <EmptyState
          title="Agrega al menos una fuente de ingreso"
          subtitle="Necesitamos saber cómo ganas dinero para identificar tus obligaciones fiscales."
          ctaLabel="Agregar fuente"
          onCta={() => navigate('/app/regime/sources/new')}
        />
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {sources.map(s => (
              <IncomeSourceCard
                key={s.id}
                source={s}
                onEdit={src => navigate(`/app/regime/sources/${src.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <PrimaryButton
              label={running ? 'Analizando…' : 'Identificar mi régimen fiscal'}
              onClick={handleRun}
              loading={running}
              className="w-full"
            />
            <button
              type="button"
              onClick={() => setShowManual(v => !v)}
              className="w-full text-sm text-text-secondary hover:text-primary text-center transition-colors"
            >
              Ya sé mi régimen (asignación manual) ↓
            </button>

            {showManual && (
              <div className="bg-surface-gray rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-text-primary">Selecciona tu obligación fiscal</p>
                <select
                  value={selectedObligation}
                  onChange={e => setSelectedObligation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white outline-none focus:border-primary"
                >
                  <option value="">Selecciona una obligación…</option>
                  {OBLIGATION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <SecondaryButton
                  label="Asignar régimen"
                  onClick={handleManualSelect}
                  disabled={!selectedObligation || running}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
