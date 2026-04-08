import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import SelectDropdown from '../../components/ui/SelectDropdown'
import MoneyInput from '../../components/ui/MoneyInput'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import SectionDivider from '../../components/ui/SectionDivider'
import { updateSession, getSession } from '../../api/sessions'
import { getDeductionsSummary } from '../../api/deductions'
import { getIncomeSources } from '../../api/incomeSources'
import { calculateTaxBuffer } from '../../api/taxBuffer'
import useSessionStore from '../../store/useSessionStore'
import { formatMXN, OBLIGATION_LABELS } from '../../utils/format'

const HORIZON_OPTIONS = [
  { value: '1', label: '1 mes' },
  { value: '2', label: '2 meses' },
  { value: '3', label: '3 meses (recomendado)' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
]

export default function BufferPage() {
  const navigate = useNavigate()
  const { sessionId, setSession } = useSessionStore()
  const [sessionData, setSessionData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    bufferHorizonMonths: '3',
    isrAlreadyWithheldMxn: '',
    ivaAlreadyPaidMxn: '',
  })

  useEffect(() => {
    Promise.all([
      getSession(sessionId),
      getDeductionsSummary(sessionId).catch(() => null),
      getIncomeSources(sessionId).catch(() => []),
    ])
      .then(([sess, sum, srcs]) => {
        setSessionData(sess)
        setSummary(sum)
        setSources(srcs || [])
        setForm({
          bufferHorizonMonths: String(sess.bufferHorizonMonths || 3),
          isrAlreadyWithheldMxn: sess.isrAlreadyWithheldMxn > 0 ? String(sess.isrAlreadyWithheldMxn) : '',
          ivaAlreadyPaidMxn: sess.ivaAlreadyPaidMxn > 0 ? String(sess.ivaAlreadyPaidMxn) : '',
        })
      })
      .catch(err => setError(err.response?.data?.error || 'Error al cargar datos.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleCalculate = async () => {
    setCalculating(true)
    setError(null)
    try {
      // Update session params first
      const updated = await updateSession(sessionId, {
        bufferHorizonMonths: Number(form.bufferHorizonMonths),
        isrAlreadyWithheldMxn: Number(form.isrAlreadyWithheldMxn) || 0,
        ivaAlreadyPaidMxn: Number(form.ivaAlreadyPaidMxn) || 0,
      })
      setSession(updated)
      // Then calculate
      await calculateTaxBuffer(sessionId)
      navigate('/app/buffer/result')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al calcular el fondo.')
    } finally {
      setCalculating(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando datos…" />

  const noDeductions = !summary || summary.totalDeductiblesMxn === 0

  // Group sources by tipoEconomico for confirmation panel
  const incomeByObligation = sources.reduce((acc, src) => {
    const key = src.tipoEconomico || 'OTRO'
    acc[key] = (acc[key] || 0) + (src.montoAnualEstimado || 0)
    return acc
  }, {})

  return (
    <AppLayout>
      <PageHeader
        title="Fondo para impuestos"
        subtitle="Ajusta los parámetros antes de calcular cuánto debes apartar cada mes."
        breadcrumb={[{ label: 'Fondo para impuestos', href: '/app/buffer' }]}
      />

      {error && <div className="mb-4"><AlertBanner type="error" message={error} /></div>}

      {noDeductions && (
        <div className="mb-5">
          <AlertBanner
            type="warning"
            message="Sin deducciones registradas, el buffer puede estar sobreestimado. ¿Quieres agregar gastos primero?"
            action="Agregar gastos"
            onAction={() => navigate('/app/expenses/new')}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Parameters form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-text-primary">Parámetros del cálculo</h2>

          <SelectDropdown
            label="Horizonte del fondo"
            name="bufferHorizonMonths"
            value={form.bufferHorizonMonths}
            onChange={handleChange}
            options={HORIZON_OPTIONS}
            hint="¿De cuántos meses quieres construir tu colchón fiscal?"
          />
          <MoneyInput
            label="ISR ya retenido por tu empleador (opcional)"
            name="isrAlreadyWithheldMxn"
            value={form.isrAlreadyWithheldMxn}
            onChange={handleChange}
            hint="Se descontará del pasivo total"
          />
          <MoneyInput
            label="IVA ya enterado en pagos provisionales (opcional)"
            name="ivaAlreadyPaidMxn"
            value={form.ivaAlreadyPaidMxn}
            onChange={handleChange}
            hint="Reduce el IVA pendiente"
          />
        </div>

        {/* Confirmation panel */}
        <div className="bg-surface-gray rounded-xl p-5">
          <h2 className="font-semibold text-text-primary mb-3">Resumen de datos</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(incomeByObligation).map(([obl, amount]) => (
              <div key={obl} className="flex justify-between">
                <span className="text-text-secondary">{OBLIGATION_LABELS[obl] || obl}</span>
                <span className="font-semibold text-text-primary">{formatMXN(amount)}</span>
              </div>
            ))}
            {summary && (
              <>
                <SectionDivider label="Deducciones" />
                <div className="flex justify-between">
                  <span className="text-text-secondary">Personales</span>
                  <span className="font-semibold text-primary">{formatMXN(summary.totalPersonalDeductiblesMxn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">De actividad</span>
                  <span className="font-semibold text-primary">{formatMXN(summary.totalActivityDeductiblesMxn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">IVA acreditable</span>
                  <span className="font-semibold text-primary">{formatMXN(summary.totalIvaAcreditableMxn)}</span>
                </div>
              </>
            )}
            <SectionDivider label="Créditos fiscales" />
            <div className="flex justify-between">
              <span className="text-text-secondary">ISR retenido configurado</span>
              <span className="font-semibold">{formatMXN(Number(form.isrAlreadyWithheldMxn) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">IVA ya pagado</span>
              <span className="font-semibold">{formatMXN(Number(form.ivaAlreadyPaidMxn) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Horizonte</span>
              <span className="font-semibold">{form.bufferHorizonMonths} {Number(form.bufferHorizonMonths) === 1 ? 'mes' : 'meses'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <PrimaryButton
          label={calculating ? 'Calculando…' : 'Calcular mi fondo mensual'}
          onClick={handleCalculate}
          loading={calculating}
          className="flex-1"
        />
        {noDeductions && (
          <SecondaryButton label="Calcular de todas formas" onClick={handleCalculate} />
        )}
      </div>
    </AppLayout>
  )
}
