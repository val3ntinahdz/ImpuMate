'use strict';

/**
 * taxCatalogs.js
 *
 * Catálogos de tipos y categorías usados por ambos módulos.
 *
 * En los módulos originales estos vivían dentro de cada archivo.
 * Al centralizar aquí se elimina la posibilidad de que un módulo
 * use un string diferente para el mismo concepto.
 */

// ─────────────────────────────────────────────────────────────────────────────
// OBLIGACIONES FISCALES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tipos de obligaciones fiscales reconocidos por el sistema.
 * Fuente: catálogo SAT / diseño de producto.
 */
const OBLIGATIONS = {
  SUELDOS_Y_SALARIOS:                             'SUELDOS_Y_SALARIOS',
  ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL:          'ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL',
  SERVICIOS_PROFESIONALES_REGIMEN_GENERAL:        'SERVICIOS_PROFESIONALES_REGIMEN_GENERAL',
  ARRENDAMIENTO_REGIMEN_GENERAL:                  'ARRENDAMIENTO_REGIMEN_GENERAL',
  ACTIVIDAD_EMPRESARIAL_RESICO:                   'ACTIVIDAD_EMPRESARIAL_RESICO',
  SERVICIOS_PROFESIONALES_RESICO:                 'SERVICIOS_PROFESIONALES_RESICO',
  ARRENDAMIENTO_RESICO:                           'ARRENDAMIENTO_RESICO',
  // Valores adicionales usados por taxRegimeIdentifier
  REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS:      'REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS',
  NO_DETERMINADA:                                 'NO_DETERMINADA',
};

// ─────────────────────────────────────────────────────────────────────────────
// CLASIFICACIONES BASE — REALIDAD ECONÓMICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Etiquetas internas de clasificación económica usadas por taxRegimeIdentifier.
 * Son intermedias: el algoritmo las convierte en OBLIGATIONS concretas.
 */
const BASE_CLASSIFICATION = Object.freeze({
  SUELDOS_Y_SALARIOS:       'SUELDOS_Y_SALARIOS',
  ACTIVIDAD_EMPRESARIAL:    'ACTIVIDAD_EMPRESARIAL',
  SERVICIOS_PROFESIONALES:  'SERVICIOS_PROFESIONALES',
  ARRENDAMIENTO:            'ARRENDAMIENTO',
  PLATAFORMAS_TECNOLOGICAS: 'PLATAFORMAS_TECNOLOGICAS',
  NO_CLASIFICADA:           'NO_CLASIFICADA',
});

// ─────────────────────────────────────────────────────────────────────────────
// PARÁMETROS DE IDENTIFICACIÓN FISCAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parámetros normativos usados por el algoritmo de identificación de régimen.
 * RESICO_MAX_ANNUAL_INCOME: igual que FISCAL_CONSTANTS.RESICO_ANNUAL_INCOME_LIMIT_MXN.
 * Centralizado aquí para que taxRegimeIdentifier importe desde un solo lugar.
 * Fuente: LISR art. 113-E
 */
const IDENTIFICATION_PARAMETERS = Object.freeze({
  RESICO_MAX_ANNUAL_INCOME:          3_500_000,
  UPDATE_NOTICE_MONTHS_AFTER_EVENT:  1,
  SAT_PERSONA_FISICA_CATEGORY_REFERENCES: [
    'SUELDOS_Y_SALARIOS',
    'ACTIVIDADES_EMPRESARIALES_Y_PROFESIONALES',
    'ARRENDAMIENTO',
    'RESICO_PERSONAS_FISICAS',
    'PLATAFORMAS_TECNOLOGICAS',
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORÍAS DE GASTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categorías de gasto soportadas por el motor de deducibles.
 * Fuente: categorías oficiales SAT / LISR.
 */
const EXPENSE_CATEGORIES = {
  // Deducciones personales
  PERSONAL_MEDICAL:                   'PERSONAL_MEDICAL',
  PERSONAL_MEDICAL_DISABILITY:        'PERSONAL_MEDICAL_DISABILITY',
  PERSONAL_OPTICAL_LENSES:            'PERSONAL_OPTICAL_LENSES',
  PERSONAL_MEDICAL_INSURANCE:         'PERSONAL_MEDICAL_INSURANCE',
  PERSONAL_TUITION:                   'PERSONAL_TUITION',
  PERSONAL_SCHOOL_TRANSPORT:          'PERSONAL_SCHOOL_TRANSPORT',
  PERSONAL_FUNERAL:                   'PERSONAL_FUNERAL',
  PERSONAL_DONATION:                  'PERSONAL_DONATION',
  PERSONAL_RETIREMENT_CONTRIBUTION:   'PERSONAL_RETIREMENT_CONTRIBUTION',
  PERSONAL_MORTGAGE_REAL_INTEREST:    'PERSONAL_MORTGAGE_REAL_INTEREST',

  // Actividad empresarial / servicios profesionales
  BUSINESS_INVENTORY_OR_RAW_MATERIALS:'BUSINESS_INVENTORY_OR_RAW_MATERIALS',
  BUSINESS_GENERAL_NECESSARY_EXPENSE: 'BUSINESS_GENERAL_NECESSARY_EXPENSE',
  BUSINESS_OFFICE_RENT:               'BUSINESS_OFFICE_RENT',
  BUSINESS_UTILITIES:                 'BUSINESS_UTILITIES',
  BUSINESS_PHONE_INTERNET:            'BUSINESS_PHONE_INTERNET',
  BUSINESS_INTEREST:                  'BUSINESS_INTEREST',
  BUSINESS_IMSS:                      'BUSINESS_IMSS',
  BUSINESS_LOCAL_TAX:                 'BUSINESS_LOCAL_TAX',
  BUSINESS_INVESTMENT:                'BUSINESS_INVESTMENT',

  // Arrendamiento
  ARR_PROPERTY_TAX:                   'ARR_PROPERTY_TAX',
  ARR_MAINTENANCE_OR_WATER:           'ARR_MAINTENANCE_OR_WATER',
  ARR_REAL_INTEREST:                  'ARR_REAL_INTEREST',
  ARR_SALARIES_FEES_TAXES:            'ARR_SALARIES_FEES_TAXES',
  ARR_INSURANCE:                      'ARR_INSURANCE',
  ARR_CONSTRUCTION_INVESTMENT:        'ARR_CONSTRUCTION_INVESTMENT',
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE DEDUCCIÓN (contrato entre módulos)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tipos de deducción producidos por el Deductibles Calculator
 * y consumidos por el Deductions Accumulator para clasificar
 * en qué bucket cae cada gasto aprobado.
 *
 * CONTRATO CRÍTICO: estos strings son el punto de integración
 * entre expenseDeductionAdvisor y taxBufferCalculator.
 * No modificar sin actualizar ambos módulos.
 */
const DEDUCTION_KINDS = {
  NOT_DEDUCTIBLE:               'NOT_DEDUCTIBLE',
  PERSONAL_ANNUAL:              'PERSONAL_ANNUAL',
  BUSINESS_CURRENT_PERIOD:      'BUSINESS_CURRENT_PERIOD_ISR',
  BUSINESS_ANNUAL_INVESTMENT:   'BUSINESS_ANNUAL_INVESTMENT_ISR',
  ARR_CURRENT_PERIOD:           'ARR_CURRENT_PERIOD_ISR',
  ARR_ANNUAL_INVESTMENT:        'ARR_ANNUAL_INVESTMENT_ISR',
  ARR_OPTIONAL_35:              'ARR_OPTIONAL_35_ISR',
};

// ─────────────────────────────────────────────────────────────────────────────
// MÉTODOS DE PAGO
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = {
  CASH:             'CASH',
  TRANSFER:         'TRANSFER',
  CREDIT_CARD:      'CREDIT_CARD',
  DEBIT_CARD:       'DEBIT_CARD',
  SERVICE_CARD:     'SERVICE_CARD',
  NOMINATIVE_CHECK: 'NOMINATIVE_CHECK',
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE FUENTE DE INGRESO
// ─────────────────────────────────────────────────────────────────────────────

const INCOME_SOURCE_TYPES = {
  SALARY:                 'SALARY',
  FREELANCE_PROFESSIONAL: 'FREELANCE_PROFESSIONAL',
  BUSINESS_ACTIVITY:      'BUSINESS_ACTIVITY',
  RENTAL_INCOME:          'RENTAL_INCOME',
  RESICO_ACTIVITY:        'RESICO_ACTIVITY',
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORÍAS SIN IVA ACREDITABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set de categorías que NO generan IVA acreditable.
 *
 * Tres razones posibles para excluir una categoría:
 * 1. Transferencia financiera sin compra de bien/servicio (intereses, aportaciones)
 * 2. Contribución obligatoria al Estado (IMSS, impuestos locales)
 * 3. Categoría expresamente exenta en LIVA (salud, educación, seguros, funerarias)
 *
 * Fuente: LIVA arts. 15-IV, 15-IX, 15-XIII, 15-XIV
 * URL: https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf
 */
const CATEGORIES_WITHOUT_IVA_ACREDITABLE = new Set([
  EXPENSE_CATEGORIES.PERSONAL_MEDICAL,
  EXPENSE_CATEGORIES.PERSONAL_MEDICAL_DISABILITY,
  EXPENSE_CATEGORIES.PERSONAL_OPTICAL_LENSES,
  EXPENSE_CATEGORIES.PERSONAL_MEDICAL_INSURANCE,
  EXPENSE_CATEGORIES.PERSONAL_TUITION,
  EXPENSE_CATEGORIES.PERSONAL_SCHOOL_TRANSPORT,
  EXPENSE_CATEGORIES.PERSONAL_FUNERAL,
  EXPENSE_CATEGORIES.PERSONAL_DONATION,
  EXPENSE_CATEGORIES.PERSONAL_RETIREMENT_CONTRIBUTION,
  EXPENSE_CATEGORIES.PERSONAL_MORTGAGE_REAL_INTEREST,
  EXPENSE_CATEGORIES.BUSINESS_INTEREST,
  EXPENSE_CATEGORIES.BUSINESS_IMSS,
  EXPENSE_CATEGORIES.BUSINESS_LOCAL_TAX,
  EXPENSE_CATEGORIES.ARR_INSURANCE,
  EXPENSE_CATEGORIES.ARR_REAL_INTEREST,
]);

module.exports = {
  OBLIGATIONS,
  BASE_CLASSIFICATION,
  IDENTIFICATION_PARAMETERS,
  EXPENSE_CATEGORIES,
  DEDUCTION_KINDS,
  PAYMENT_METHODS,
  INCOME_SOURCE_TYPES,
  CATEGORIES_WITHOUT_IVA_ACREDITABLE,
};
