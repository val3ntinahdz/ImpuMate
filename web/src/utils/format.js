export function formatMXN(amount) {
  if (amount === null || amount === undefined) return '$0.00 MXN'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' MXN'
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '0'
  return new Intl.NumberFormat('es-MX').format(n)
}

export const OBLIGATION_LABELS = {
  SUELDOS_Y_SALARIOS: 'Sueldos y Salarios',
  ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL: 'Actividad Empresarial — Régimen General',
  SERVICIOS_PROFESIONALES_REGIMEN_GENERAL: 'Servicios Profesionales — Régimen General',
  ARRENDAMIENTO_REGIMEN_GENERAL: 'Arrendamiento — Régimen General',
  ACTIVIDAD_EMPRESARIAL_RESICO: 'Actividad Empresarial — RESICO',
  SERVICIOS_PROFESIONALES_RESICO: 'Servicios Profesionales — RESICO',
  ARRENDAMIENTO_RESICO: 'Arrendamiento — RESICO',
}

export const CATEGORY_LABELS = {
  PERSONAL_MEDICAL: 'Gastos médicos y hospitalarios',
  PERSONAL_MEDICAL_DISABILITY: 'Médicos por discapacidad (≥50%)',
  PERSONAL_OPTICAL_LENSES: 'Lentes graduados',
  PERSONAL_MEDICAL_INSURANCE: 'Seguro de gastos médicos mayores',
  PERSONAL_TUITION: 'Colegiaturas',
  PERSONAL_SCHOOL_TRANSPORT: 'Transporte escolar obligatorio',
  PERSONAL_FUNERAL: 'Gastos funerarios',
  PERSONAL_DONATION: 'Donativos a donatarias autorizadas',
  PERSONAL_RETIREMENT_CONTRIBUTION: 'Aportaciones voluntarias AFORE',
  PERSONAL_MORTGAGE_REAL_INTEREST: 'Intereses reales hipotecarios',
  BUSINESS_INVENTORY_OR_RAW_MATERIALS: 'Inventario o materias primas',
  BUSINESS_GENERAL_NECESSARY_EXPENSE: 'Gastos generales de actividad',
  BUSINESS_OFFICE_RENT: 'Renta de oficina o coworking',
  BUSINESS_UTILITIES: 'Servicios (agua, luz, gas)',
  BUSINESS_PHONE_INTERNET: 'Teléfono e internet',
  BUSINESS_INTEREST: 'Intereses de crédito de actividad',
  BUSINESS_IMSS: 'Cuotas IMSS patronales',
  BUSINESS_LOCAL_TAX: 'Impuestos locales (nóminas, etc.)',
  BUSINESS_INVESTMENT: 'Inversiones (equipo, activos fijos)',
  ARR_PROPERTY_TAX: 'Predial del inmueble',
  ARR_MAINTENANCE_OR_WATER: 'Mantenimiento o agua',
  ARR_REAL_INTEREST: 'Intereses reales (hipoteca del inmueble)',
  ARR_SALARIES_FEES_TAXES: 'Honorarios, salarios, impuestos del inmueble',
  ARR_INSURANCE: 'Seguro del inmueble',
  ARR_CONSTRUCTION_INVESTMENT: 'Inversiones en construcción',
}

export const DEDUCTION_KIND_LABELS = {
  PERSONAL_ANNUAL: 'Deducción personal anual',
  BUSINESS_CURRENT_PERIOD_ISR: 'Gasto de actividad (deducción al 100%)',
  BUSINESS_ANNUAL_INVESTMENT_ISR: 'Inversión — deducción parcial anual',
  ARR_CURRENT_PERIOD_ISR: 'Gasto de arrendamiento (deducción al 100%)',
  ARR_ANNUAL_INVESTMENT_ISR: 'Inversión en construcción (5% anual)',
  ARR_OPTIONAL_35_ISR: 'Deducción ciega 35% arrendamiento',
  NOT_DEDUCTIBLE: 'No deducible',
}
