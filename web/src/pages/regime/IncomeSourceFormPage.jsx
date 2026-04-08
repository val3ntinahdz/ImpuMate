import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import InputField from '../../components/ui/InputField'
import MoneyInput from '../../components/ui/MoneyInput'
import ToggleRow from '../../components/ui/ToggleRow'
import SelectDropdown from '../../components/ui/SelectDropdown'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { createIncomeSource, updateIncomeSource, getIncomeSources } from '../../api/incomeSources'
import useSessionStore from '../../store/useSessionStore'

const QUIEN_PAGA_OPTIONS = [
  { value: 'PATRON', label: 'Un patrón o empresa donde trabajo' },
  { value: 'PERSONA_MORAL', label: 'Empresas que contratan mis servicios' },
  { value: 'PERSONA_FISICA', label: 'Personas físicas que contratan mis servicios' },
  { value: 'PLATAFORMA', label: 'Una plataforma digital (Uber, Rappi, Airbnb…)' },
]

const INITIAL = {
  descripcion: '',
  tipoEconomico: '',
  montoAnualEstimado: '',
  quienPaga: '',
  existeRelacionSubordinada: false,
  recibeCfdiNomina: false,
  vendeBienes: false,
  prestaSErvcioIndependiente: false,
  otorgaUsoGoceInmueble: false,
  usaPlataformaTecnologica: false,
  emiteCFDI: false,
  clienteRetieneISR: false,
  clienteRetieneIVA: false,
  isSubjectToIva: false,
}

// Hardcoded happy-path selector for AI prefill demo.
// Change this constant to switch between scenarios.
const AI_PREFILL_SCENARIO = 'PATRON_NOMINA' // or: 'PATRON_NOMINA'AGENCIA_SERVICIOS

const AI_PREFILLS = {
  AGENCIA_SERVICIOS: {
    descripcion: 'Desarrolladora de Software en una agencia',
    montoAnualEstimado: '240000',
    quienPaga: 'PERSONA_MORAL',
    existeRelacionSubordinada: false,
    recibeCfdiNomina: false,
    vendeBienes: false,
    prestaSErvcioIndependiente: true,
    otorgaUsoGoceInmueble: false,
    usaPlataformaTecnologica: false,
    emiteCFDI: true,
    clienteRetieneISR: true,
    clienteRetieneIVA: true,
    isSubjectToIva: true,
  },
  PATRON_NOMINA: {
    descripcion: 'Software Developer',
    montoAnualEstimado: '200000',
    quienPaga: 'PATRON',
    existeRelacionSubordinada: true,
    recibeCfdiNomina: true,
    vendeBienes: false,
    prestaSErvcioIndependiente: false,
    otorgaUsoGoceInmueble: false,
    usaPlataformaTecnologica: false,
    emiteCFDI: false,
    clienteRetieneISR: false,
    clienteRetieneIVA: false,
    isSubjectToIva: false,
  },
}

const AI_PREFILL = AI_PREFILLS[AI_PREFILL_SCENARIO]

function MagicWandIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.2903 4.14004L17.2203 7.93004C17.2103 8.45004 17.5403 9.14004 17.9603 9.45004L20.4403 11.33C22.0303 12.53 21.7703 14 19.8703 14.6L16.6403 15.61C16.1003 15.78 15.5303 16.37 15.3903 16.92L14.6203 19.86C14.0103 22.18 12.4903 22.41 11.2303 20.37L9.47027 17.52C9.15027 17 8.39027 16.61 7.79027 16.64L4.45027 16.81C2.06027 16.93 1.38027 15.55 2.94027 13.73L4.92027 11.43C5.29027 11 5.46027 10.2 5.29027 9.66004L4.27027 6.42004C3.68027 4.52004 4.74027 3.47004 6.63027 4.09004L9.58027 5.06004C10.0803 5.22004 10.8303 5.11004 11.2503 4.80004L14.3303 2.58004C16.0003 1.39004 17.3303 2.09004 17.2903 4.14004Z" />
      <path d="M21.4403 20.4702L18.4103 17.4402C18.1203 17.1502 17.6403 17.1502 17.3503 17.4402C17.0603 17.7302 17.0603 18.2102 17.3503 18.5002L20.3803 21.5302C20.5303 21.6802 20.7203 21.7502 20.9103 21.7502C21.1003 21.7502 21.2903 21.6802 21.4403 21.5302C21.7303 21.2402 21.7303 20.7602 21.4403 20.4702Z" />
    </svg>
  )
}

export default function IncomeSourceFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { sessionId } = useSessionStore()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiPrefilling, setAiPrefilling] = useState(false)
  const aiTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!aiModalOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setAiModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aiModalOpen])

  const startAiPrefill = () => {
    setAiModalOpen(false)
    setAiPrefilling(true)
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current)
    aiTimerRef.current = window.setTimeout(() => {
      setForm(f => ({ ...f, ...AI_PREFILL }))
      setErrors({})
      setAiPrefilling(false)
    }, 1000)
  }

  useEffect(() => {
    if (!isEdit) return
    getIncomeSources(sessionId)
      .then(sources => {
        const src = sources.find(s => s.id === id)
        if (src) {
          setForm({
            descripcion: src.descripcion || '',
            tipoEconomico: src.tipoEconomico || '',
            montoAnualEstimado: String(src.montoAnualEstimado || ''),
            quienPaga: src.quienPaga || '',
            existeRelacionSubordinada: src.existeRelacionSubordinada || false,
            recibeCfdiNomina: src.recibeCfdiNomina || false,
            vendeBienes: src.vendeBienes || false,
            prestaSErvcioIndependiente: src.prestaSErvcioIndependiente || false,
            otorgaUsoGoceInmueble: src.otorgaUsoGoceInmueble || false,
            usaPlataformaTecnologica: src.usaPlataformaTecnologica || false,
            emiteCFDI: src.emiteCFDI || false,
            clienteRetieneISR: src.clienteRetieneISR || false,
            clienteRetieneIVA: src.clienteRetieneIVA || false,
            isSubjectToIva: src.isSubjectToIva || false,
          })
        }
      })
      .catch(() => setApiError('No se pudo cargar la fuente de ingreso.'))
      .finally(() => setLoading(false))
  }, [id, sessionId, isEdit])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: null }))
  }

  const toggleField = (name) => (e) => {
    setForm(f => ({ ...f, [name]: e.target.value }))
  }

  const validate = () => {
    const e = {}
    if (!form.montoAnualEstimado || Number(form.montoAnualEstimado) <= 0)
      e.montoAnualEstimado = 'Ingresa un monto válido'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    setApiError(null)
    try {
      const payload = {
        ...form,
        idFuente: id || `fuente-${Date.now()}`,
        montoAnualEstimado: Number(form.montoAnualEstimado),
      }
      if (isEdit) {
        await updateIncomeSource(sessionId, id, payload)
      } else {
        await createIncomeSource(sessionId, payload)
      }
      navigate('/app/profile?tab=sources')
    } catch (err) {
      setApiError(err.response?.data?.error || 'Error al guardar la fuente de ingreso.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando datos…" />

  return (
    <AppLayout>
      <PageHeader
        title={isEdit ? 'Editar Fuente de Ingreso' : 'Agregar Fuente de Ingreso'}
        subtitle="Describe cómo obtienes este ingreso."
        breadcrumb={[
          { label: 'Perfil', href: '/app/profile' },
          { label: 'Fuentes de ingreso', href: '/app/profile?tab=sources' },
          { label: isEdit ? 'Editar' : 'Nueva fuente' },
        ]}
      />

      <div className="mb-6">
        <SecondaryButton
          label="Prellenar con AI"
          loading={aiPrefilling}
          disabled={aiPrefilling}
          onClick={() => setAiModalOpen(true)}
        />
      </div>

      {apiError && <div className="mb-4"><AlertBanner type="error" message={apiError} /></div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-5">
        <InputField
          label="Descripción (cómo llamas a esta actividad)"
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          hint='Ej. "Diseño freelance", "Trabajo en empresa", "Rento mi departamento"'
        />

        <MoneyInput
          label="Ingreso anual estimado (sin IVA)"
          name="montoAnualEstimado"
          value={form.montoAnualEstimado}
          onChange={handleChange}
          error={errors.montoAnualEstimado}
          required
        />

        <SelectDropdown
          label="¿Quién te paga?"
          name="quienPaga"
          value={form.quienPaga}
          onChange={handleChange}
          options={QUIEN_PAGA_OPTIONS}
        />

        <div className="bg-surface-gray rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Características de tu actividad
          </p>
          <ToggleRow label="¿Alguien te da nómina o recibo de sueldo?" name="existeRelacionSubordinada" value={form.existeRelacionSubordinada} onChange={toggleField('existeRelacionSubordinada')} hint="Indica relación laboral → Sueldos y Salarios" />
          <ToggleRow label="¿Recibes CFDI de nómina?" name="recibeCfdiNomina" value={form.recibeCfdiNomina} onChange={toggleField('recibeCfdiNomina')} />
          <ToggleRow label="¿Vendes productos o bienes?" name="vendeBienes" value={form.vendeBienes} onChange={toggleField('vendeBienes')} hint="→ Actividad Empresarial" />
          <ToggleRow label="¿Prestas servicios a tus propios clientes?" name="prestaSErvcioIndependiente" value={form.prestaSErvcioIndependiente} onChange={toggleField('prestaSErvcioIndependiente')} hint="→ Servicios Profesionales" />
          <ToggleRow label="¿Rentas un inmueble?" name="otorgaUsoGoceInmueble" value={form.otorgaUsoGoceInmueble} onChange={toggleField('otorgaUsoGoceInmueble')} hint="→ Arrendamiento" />
          <ToggleRow label="¿Usas una plataforma como intermediario? (Uber, Airbnb…)" name="usaPlataformaTecnologica" value={form.usaPlataformaTecnologica} onChange={toggleField('usaPlataformaTecnologica')} />
        </div>

        <div className="bg-surface-gray rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Facturación y retenciones
          </p>
          <ToggleRow label="¿Emites facturas (CFDI) a tus clientes?" name="emiteCFDI" value={form.emiteCFDI} onChange={toggleField('emiteCFDI')} />
          <ToggleRow label="¿Tu cliente te retiene ISR?" name="clienteRetieneISR" value={form.clienteRetieneISR} onChange={toggleField('clienteRetieneISR')} />
          <ToggleRow label="¿Tu cliente te retiene IVA?" name="clienteRetieneIVA" value={form.clienteRetieneIVA} onChange={toggleField('clienteRetieneIVA')} />
          <ToggleRow label="¿Esta actividad está sujeta a IVA al 16%?" name="isSubjectToIva" value={form.isSubjectToIva} onChange={toggleField('isSubjectToIva')} />
        </div>

        <div className="flex gap-3 pt-2">
          <PrimaryButton label={isEdit ? 'Guardar cambios' : 'Agregar fuente'} type="submit" loading={saving} className="flex-1" />
          <SecondaryButton label="Cancelar" onClick={() => navigate('/app/profile?tab=sources')} />
        </div>
      </form>

      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar"
            onClick={() => setAiModalOpen(false)}
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-gray-200 shadow-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-primary">Prellenar con AI</h2>
                <p className="mt-1 text-sm text-text-secondary">Describe tu tipo de ingreso tan detallado como puedas</p>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="rounded-md p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="mt-4 w-full min-h-[140px] rounded-xl border border-gray-200 p-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Escribe aqui..."
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <SecondaryButton label="Cancelar" onClick={() => setAiModalOpen(false)} />
              <button
                type="button"
                onClick={startAiPrefill}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-accent font-semibold text-sm transition-all duration-150 hover:opacity-90 active:opacity-80"
              >
                Prellenar con AI
                <MagicWandIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
