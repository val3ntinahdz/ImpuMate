import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import SelectDropdown from '../../components/ui/SelectDropdown'
import ToggleRow from '../../components/ui/ToggleRow'
import MoneyInput from '../../components/ui/MoneyInput'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import { createSession } from '../../api/sessions'
import useSessionStore from '../../store/useSessionStore'

const YEAR_OPTIONS = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
]

const HORIZON_OPTIONS = [
  { value: '1', label: '1 mes' },
  { value: '2', label: '2 meses' },
  { value: '3', label: '3 meses (recomendado)' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
]

export default function SessionNewPage() {
  const navigate = useNavigate()
  const { setSession } = useSessionStore()
  const [form, setForm] = useState({
    exerciseYear: '2026',
    bufferHorizonMonths: '3',
    hasIsrWithheld: false,
    isrAlreadyWithheldMxn: '',
    hasIvaPaid: false,
    ivaAlreadyPaidMxn: '',
  })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.exerciseYear) e.exerciseYear = 'El año es requerido'
    if (!form.bufferHorizonMonths) e.bufferHorizonMonths = 'El horizonte es requerido'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setApiError(null)
    try {
      const payload = {
        exerciseYear: Number(form.exerciseYear),
        bufferHorizonMonths: Number(form.bufferHorizonMonths),
        isrAlreadyWithheldMxn: form.hasIsrWithheld ? Number(form.isrAlreadyWithheldMxn) || 0 : 0,
        ivaAlreadyPaidMxn: form.hasIvaPaid ? Number(form.ivaAlreadyPaidMxn) || 0 : 0,
      }
      const session = await createSession(payload)
      setSession(session)
      navigate('/app/regime')
    } catch (err) {
      if (err.response?.status === 409) {
        setApiError({
          type: 'warning',
          message: `Ya tienes un ejercicio para ${form.exerciseYear}. ¿Deseas verlo?`,
          action: 'Ver sesión existente',
        })
      } else {
        setApiError({
          type: 'error',
          message: err.response?.data?.error || 'Error al crear la sesión.',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Nueva Sesión Fiscal"
        subtitle="Abre un espacio de cálculo para un año específico."
        breadcrumb={[{ label: 'Sesiones', href: '/sessions' }, { label: 'Nueva sesión' }]}
      />

      {apiError && (
        <div className="mb-4">
          <AlertBanner
            type={apiError.type}
            message={apiError.message}
            action={apiError.action}
            onAction={() => navigate('/sessions')}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-5">
        <SelectDropdown
          label="Año del ejercicio"
          name="exerciseYear"
          value={form.exerciseYear}
          onChange={handleChange}
          options={YEAR_OPTIONS}
          error={errors.exerciseYear}
          required
        />
        <SelectDropdown
          label="Horizonte del buffer"
          name="bufferHorizonMonths"
          value={form.bufferHorizonMonths}
          onChange={handleChange}
          options={HORIZON_OPTIONS}
          error={errors.bufferHorizonMonths}
          hint="¿En cuántos meses quieres cubrir tu pasivo fiscal?"
        />

        <div className="bg-surface-gray rounded-lg p-4 space-y-4">
          <ToggleRow
            label="¿Tu empleador ya te retuvo ISR este año?"
            name="hasIsrWithheld"
            value={form.hasIsrWithheld}
            onChange={e => setForm(f => ({ ...f, hasIsrWithheld: e.target.value }))}
          />
          {form.hasIsrWithheld && (
            <MoneyInput
              label="Monto ISR retenido (anual)"
              name="isrAlreadyWithheldMxn"
              value={form.isrAlreadyWithheldMxn}
              onChange={handleChange}
            />
          )}
          <ToggleRow
            label="¿Ya pagaste IVA en pagos provisionales?"
            name="hasIvaPaid"
            value={form.hasIvaPaid}
            onChange={e => setForm(f => ({ ...f, hasIvaPaid: e.target.value }))}
          />
          {form.hasIvaPaid && (
            <MoneyInput
              label="Monto IVA ya pagado"
              name="ivaAlreadyPaidMxn"
              value={form.ivaAlreadyPaidMxn}
              onChange={handleChange}
            />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <PrimaryButton label="Crear sesión" type="submit" loading={loading} className="flex-1" />
          <SecondaryButton label="Cancelar" onClick={() => navigate('/sessions')} />
        </div>
      </form>
    </AppLayout>
  )
}
