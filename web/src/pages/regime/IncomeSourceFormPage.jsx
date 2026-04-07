import React, { useEffect, useState } from 'react'
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
      navigate('/app/regime/sources')
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
          { label: 'Régimen', href: '/app/regime' },
          { label: 'Fuentes', href: '/app/regime/sources' },
          { label: isEdit ? 'Editar' : 'Nueva fuente' },
        ]}
      />

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
          <SecondaryButton label="Cancelar" onClick={() => navigate('/app/regime/sources')} />
        </div>
      </form>
    </AppLayout>
  )
}
