import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'
import MoneyInput from '../../components/ui/MoneyInput'
import ToggleRow from '../../components/ui/ToggleRow'
import SelectDropdown from '../../components/ui/SelectDropdown'
import InputField from '../../components/ui/InputField'
import PrimaryButton from '../../components/ui/PrimaryButton'
import SecondaryButton from '../../components/ui/SecondaryButton'
import AlertBanner from '../../components/ui/AlertBanner'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import SectionDivider from '../../components/ui/SectionDivider'
import { createExpense, updateExpense, getExpense } from '../../api/expenses'
import useSessionStore from '../../store/useSessionStore'
import useCategoryFields from '../../hooks/useCategoryFields'
import { CATEGORY_LABELS } from '../../utils/format'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia bancaria' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { value: 'DEBIT_CARD', label: 'Tarjeta de débito' },
  { value: 'SERVICE_CARD', label: 'Tarjeta de servicio' },
  { value: 'NOMINATIVE_CHECK', label: 'Cheque nominativo' },
]

const COMMON_TOGGLES = [
  { name: 'hasCFDI', label: '¿Tiene CFDI (factura electrónica)?', hint: 'Requerido para casi todas las categorías' },
  { name: 'invoiceReceiverRFCMatchesTaxpayer', label: '¿La factura está a tu nombre (RFC)?', hint: 'Rechaza si no coincide' },
  { name: 'paidFromTaxpayerAccount', label: '¿El pago salió de tu cuenta?' },
  { name: 'paidInRelevantFiscalYear', label: '¿El pago fue en este ejercicio fiscal?' },
]

export default function ExpenseFormPage() {
  const navigate = useNavigate()
  const { category, id } = useParams()
  const { sessionId } = useSessionStore()
  const isEdit = Boolean(id) && !category

  // Determine actual category
  const [resolvedCategory, setResolvedCategory] = useState(category || null)

  const extraFields = useCategoryFields(resolvedCategory)

  const [form, setForm] = useState({
    amountMXN: '',
    paymentMethod: '',
    hasCFDI: true,
    invoiceReceiverRFCMatchesTaxpayer: true,
    paidFromTaxpayerAccount: true,
    paidInRelevantFiscalYear: true,
  })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getExpense(sessionId, id)
      .then(data => {
        const exp = data.expense || data
        setResolvedCategory(exp.category)
        const { id: _id, sessionId: _sid, evaluationResult, ...rest } = exp
        setForm({
          amountMXN: String(rest.amountMXN || ''),
          paymentMethod: rest.paymentMethod || '',
          hasCFDI: rest.hasCFDI ?? true,
          invoiceReceiverRFCMatchesTaxpayer: rest.invoiceReceiverRFCMatchesTaxpayer ?? true,
          paidFromTaxpayerAccount: rest.paidFromTaxpayerAccount ?? true,
          paidInRelevantFiscalYear: rest.paidInRelevantFiscalYear ?? true,
          ...rest,
        })
      })
      .catch(() => setApiError('No se pudo cargar el gasto.'))
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
    if (!form.amountMXN || Number(form.amountMXN) <= 0) e.amountMXN = 'Ingresa un monto válido'
    if (!form.paymentMethod) e.paymentMethod = 'Selecciona el método de pago'
    extraFields.forEach(field => {
      if (field.required && field.type !== 'toggle') {
        if (!form[field.name] && form[field.name] !== false) e[field.name] = 'Campo requerido'
      }
    })
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
        category: resolvedCategory,
        amountMXN: Number(form.amountMXN),
        disabilityPercentage: form.disabilityPercentage ? Number(form.disabilityPercentage) : undefined,
      }
      // Remove undefined keys
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

      let result
      if (isEdit) {
        result = await updateExpense(sessionId, id, payload)
        navigate(`/app/expenses/${id}`)
      } else {
        result = await createExpense(sessionId, payload)
        const newId = result.expense?.id
        navigate(`/app/expenses/${newId}`)
      }
    } catch (err) {
      setApiError(err.response?.data?.error || 'Error al guardar el gasto.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Cargando gasto…" />

  const categoryLabel = CATEGORY_LABELS[resolvedCategory] || resolvedCategory || 'Nuevo Gasto'

  return (
    <AppLayout>
      <PageHeader
        title={isEdit ? `Editar: ${categoryLabel}` : categoryLabel}
        subtitle={isEdit ? 'Modifica los datos del gasto.' : 'Completa los datos del gasto manualmente.'}
        breadcrumb={[
          { label: 'Gastos', href: '/app/expenses' },
          { label: isEdit ? 'Editar' : 'Nuevo gasto' },
        ]}
      />

      {apiError && <div className="mb-4"><AlertBanner type="error" message={apiError} /></div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-5">

        {/* Amount */}
        <MoneyInput
          label="Monto del gasto"
          name="amountMXN"
          value={form.amountMXN}
          onChange={handleChange}
          error={errors.amountMXN}
          required
        />

        {/* Payment method */}
        <SelectDropdown
          label="Método de pago"
          name="paymentMethod"
          value={form.paymentMethod}
          onChange={handleChange}
          options={PAYMENT_METHOD_OPTIONS}
          error={errors.paymentMethod}
          required
        />

        <SectionDivider label="Requisitos de deducibilidad" />

        {/* Common toggles */}
        <div className="bg-surface-gray rounded-lg p-4 space-y-3">
          {COMMON_TOGGLES.map(t => (
            <ToggleRow
              key={t.name}
              label={t.label}
              hint={t.hint}
              name={t.name}
              value={form[t.name] ?? false}
              onChange={toggleField(t.name)}
            />
          ))}
        </div>

        {/* Extra fields per category */}
        {extraFields.length > 0 && (
          <>
            <SectionDivider label="Datos específicos de la categoría" />
            <div className="space-y-4">
              {extraFields.map(field => {
                if (field.type === 'toggle') {
                  return (
                    <div key={field.name} className="bg-surface-gray rounded-lg p-4">
                      <ToggleRow
                        label={field.label}
                        hint={field.hint}
                        name={field.name}
                        value={form[field.name] ?? false}
                        onChange={toggleField(field.name)}
                      />
                    </div>
                  )
                }
                if (field.type === 'select') {
                  return (
                    <SelectDropdown
                      key={field.name}
                      label={field.label}
                      name={field.name}
                      value={form[field.name] || ''}
                      onChange={handleChange}
                      options={field.options}
                      error={errors[field.name]}
                      required={field.required}
                    />
                  )
                }
                if (field.type === 'number') {
                  return (
                    <InputField
                      key={field.name}
                      label={field.label}
                      name={field.name}
                      type="number"
                      value={form[field.name] || ''}
                      onChange={handleChange}
                      error={errors[field.name]}
                      hint={field.hint}
                      required={field.required}
                    />
                  )
                }
                return null
              })}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <PrimaryButton
            label={isEdit ? 'Guardar cambios' : 'Registrar gasto'}
            type="submit"
            loading={saving}
            className="flex-1"
          />
          <SecondaryButton label="Cancelar" onClick={() => navigate('/app/expenses')} />
        </div>
      </form>
    </AppLayout>
  )
}
