import React from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/ui/PageHeader'

const CATEGORIES = [
  { family: 'Deducciones Personales', icon: '🏥', items: [
    { value: 'PERSONAL_MEDICAL', label: 'Gastos médicos y hospitalarios' },
    { value: 'PERSONAL_MEDICAL_DISABILITY', label: 'Médicos por discapacidad (≥50%)' },
    { value: 'PERSONAL_OPTICAL_LENSES', label: 'Lentes graduados' },
    { value: 'PERSONAL_MEDICAL_INSURANCE', label: 'Seguro de gastos médicos mayores' },
    { value: 'PERSONAL_TUITION', label: 'Colegiaturas' },
    { value: 'PERSONAL_SCHOOL_TRANSPORT', label: 'Transporte escolar obligatorio' },
    { value: 'PERSONAL_FUNERAL', label: 'Gastos funerarios' },
    { value: 'PERSONAL_DONATION', label: 'Donativos a donatarias autorizadas' },
    { value: 'PERSONAL_RETIREMENT_CONTRIBUTION', label: 'Aportaciones voluntarias AFORE' },
    { value: 'PERSONAL_MORTGAGE_REAL_INTEREST', label: 'Intereses reales hipotecarios' },
  ]},
  { family: 'Gastos de Actividad', icon: '💼', items: [
    { value: 'BUSINESS_INVENTORY_OR_RAW_MATERIALS', label: 'Inventario o materias primas' },
    { value: 'BUSINESS_GENERAL_NECESSARY_EXPENSE', label: 'Gastos generales de actividad' },
    { value: 'BUSINESS_OFFICE_RENT', label: 'Renta de oficina o coworking' },
    { value: 'BUSINESS_UTILITIES', label: 'Servicios (agua, luz, gas)' },
    { value: 'BUSINESS_PHONE_INTERNET', label: 'Teléfono e internet' },
    { value: 'BUSINESS_INTEREST', label: 'Intereses de crédito de actividad' },
    { value: 'BUSINESS_IMSS', label: 'Cuotas IMSS patronales' },
    { value: 'BUSINESS_LOCAL_TAX', label: 'Impuestos locales (nóminas, etc.)' },
    { value: 'BUSINESS_INVESTMENT', label: 'Inversiones (equipo, activos fijos)' },
  ]},
  { family: 'Arrendamiento', icon: '🏠', items: [
    { value: 'ARR_PROPERTY_TAX', label: 'Predial del inmueble' },
    { value: 'ARR_MAINTENANCE_OR_WATER', label: 'Mantenimiento o agua' },
    { value: 'ARR_REAL_INTEREST', label: 'Intereses reales (hipoteca del inmueble)' },
    { value: 'ARR_SALARIES_FEES_TAXES', label: 'Honorarios, salarios, impuestos del inmueble' },
    { value: 'ARR_INSURANCE', label: 'Seguro del inmueble' },
    { value: 'ARR_CONSTRUCTION_INVESTMENT', label: 'Inversiones en construcción' },
  ]},
]

export default function ExpenseNewPage() {
  const navigate = useNavigate()

  return (
    <AppLayout>
      <PageHeader
        title="Selecciona la Categoría"
        subtitle="¿Qué tipo de gasto quieres registrar?"
        breadcrumb={[{ label: 'Gastos', href: '/app/expenses' }, { label: 'Nuevo gasto' }]}
      />

      <div className="space-y-4">
        {CATEGORIES.map(group => (
          <div key={group.family} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-surface-gray border-b border-gray-100">
              <p className="font-semibold text-text-primary text-sm">{group.icon} {group.family}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {group.items.map(item => (
                <button
                  key={item.value}
                  onClick={() => navigate(`/app/expenses/new/${item.value}`)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-surface-gray transition-colors group"
                >
                  <span className="text-sm text-text-primary group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                  <svg className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
