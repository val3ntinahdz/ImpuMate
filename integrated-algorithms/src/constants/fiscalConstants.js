'use strict';

/**
 * fiscalConstants.js
 *
 * FUENTE ÚNICA DE VERDAD para todas las constantes fiscales del sistema.
 *
 * PROBLEMA QUE RESUELVE:
 * Los módulos originales (expenseDeductionAdvisor.js y taxBufferCalculator.js)
 * fueron desarrollados de forma independiente y definían sus propias constantes:
 *   - advisor usaba: OFFICIAL_PARAMETERS_2026
 *   - buffer  usaba: FISCAL_PARAMETERS_2026
 *
 * Ambos contenían el valor de la UMA 2026 ($42,794.64) duplicado.
 * Este archivo elimina esa duplicación y centraliza todo bajo un solo objeto: FISCAL_CONSTANTS.
 *
 * REGLA: Ningún otro archivo del proyecto debe hardcodear valores fiscales.
 * Todos deben importar desde aquí.
 */

// ─────────────────────────────────────────────────────────────────────────────
// METADATOS DEL EJERCICIO FISCAL
// ─────────────────────────────────────────────────────────────────────────────

const EXERCISE_YEAR = 2026;

/**
 * Valor anual de la UMA 2026.
 * Tipo: number (float, MXN)
 * Fuente: INEGI
 * URL: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf
 */
const ANNUAL_UMA_VALUE_MXN = 42_794.64;

/**
 * Tasa general del IVA en México.
 * Tipo: number (float, fracción decimal)
 * Fuente: LIVA art. 1
 * URL: https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf
 */
const GENERAL_IVA_RATE = 0.16;
const PROFESSIONAL_SERVICES_ISR_WITHHOLDING_RATE = 0.10;
const RESICO_PROFESSIONAL_SERVICES_ISR_WITHHOLDING_RATE = 0.0125;
const PROFESSIONAL_SERVICES_IVA_WITHHOLDING_RATE = 2 / 3;

/**
 * Límite anual de ingresos para calificar en RESICO personas físicas.
 * Tipo: number (float, MXN)
 * Fuente: LISR art. 113-E
 * URL: https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
 */
const RESICO_ANNUAL_INCOME_LIMIT_MXN = 3_500_000;

/**
 * Umbral a partir del cual los pagos deben estar bancarizados para ser deducibles.
 * Tipo: number (float, MXN)
 * Fuente: LISR, requisitos de deducciones, art. 27.
 */
const BANKED_PAYMENT_THRESHOLD_MXN = 2_000;

/**
 * Disclaimer legal obligatorio que acompaña todo output fiscal del sistema.
 * Tipo: string
 */
const LEGAL_DISCLAIMER =
  'Esta información es educativa y no constituye asesoría fiscal, legal ni contable. ' +
  'Los resultados se basan en reglas generales del SAT para 2026 y pueden no aplicar ' +
  'a tu situación específica. Verifica siempre en sat.gob.mx o consulta a un contador autorizado.';

// ─────────────────────────────────────────────────────────────────────────────
// DEDUCCIONES PERSONALES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reglas del tope global de deducciones personales.
 * Se aplica el MENOR entre: 5 UMA anuales o 15% del ingreso total del contribuyente.
 * Fuente: SAT minisitio deducciones personales
 * URL: https://www.sat.gob.mx/minisitio/DeduccionesPersonales/index.html
 */
const PERSONAL_DEDUCTIONS_GLOBAL_CAP = {
  umaMultiplier:      5,
  incomePercentage:   0.15,
};

/**
 * Montos anuales máximos deducibles por nivel educativo (colegiaturas).
 * Tipo: object (mapa nivel → MXN)
 * Fuente: SAT colegiaturas
 * URL: https://www.sat.gob.mx/minisitio/DeduccionesPersonales/colegiaturas.html
 */
const TUITION_ANNUAL_CAPS_MXN = {
  PREESCOLAR:          14_200,
  PRIMARIA:            12_900,
  SECUNDARIA:          19_900,
  PROFESIONAL_TECNICO: 17_100,
  BACHILLERATO:        24_500,
};

/**
 * Topes para deducciones específicas personales.
 * Fuentes: minisitios SAT correspondientes.
 */
const PERSONAL_DEDUCTION_SPECIFIC_CAPS = {
  /**
   * Lentes graduados: máximo $2,500 por ejercicio.
   * URL: https://www.sat.gob.mx/minisitio/DeduccionesPersonales/gastos_medicos.html
   */
  opticalLensesCapMXN: 2_500,

  /**
   * Gastos funerarios: máximo 1 UMA anual.
   * URL: https://www.sat.gob.mx/minisitio/DeduccionesPersonales/gastos_funerarios.html
   */
  funeralCapUMAMultiplier: 1,

  /**
   * Créditos hipotecarios: el crédito no debe exceder 750,000 UDIS.
   * URL: https://www.sat.gob.mx/minisitio/DeduccionesPersonales/creditos_hipotecarios.html
   */
  mortgageCreditUDILimit: 750_000,

  /**
   * Donativos: 7% general; 4% para Federación, estados, municipios.
   * URL: https://www.sat.gob.mx/minisitio/DeduccionesPersonales/donaciones.html
   */
  donationCapGeneralPercentage:    0.07,
  donationCapGovernmentPercentage: 0.04,

  /**
   * Aportaciones para retiro: menor entre 10% del ingreso acumulable y 5 UMA.
   * URL: https://www.sat.gob.mx/minisitio/DeduccionesPersonales/aportaciones_complementarias.html
   */
  retirementCapIncomePercentage: 0.10,
  retirementCapUMAMultiplier:    5,
};

// ─────────────────────────────────────────────────────────────────────────────
// INVERSIONES — TASAS DE DEDUCCIÓN ANUAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tasas anuales de deducción de inversiones para actividad empresarial / profesional.
 * Fuente: LISR arts. 34, 103, 104, 105
 * URL: https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
 */
const INVESTMENT_DEDUCTION_RATES_BUSINESS = {
  CONSTRUCTION:         0.05,
  INSTALLATION_EXPENSES:0.10,
  OFFICE_FURNITURE:     0.10,
  COMPUTER_EQUIPMENT:   0.30,
  AUTOMOBILE:           0.25,
};

/**
 * Tasas anuales de deducción de inversiones para arrendamiento (Título IV, art. 149).
 * Fuente: LISR arts. 115, 149
 */
const INVESTMENT_DEDUCTION_RATES_RENTAL = {
  CONSTRUCTION:         0.05,
  INSTALLATION_EXPENSES:0.10,
  COMPUTER_EQUIPMENT:   0.30,
  OTHER_TANGIBLE_ASSET: 0.10,
};

// ─────────────────────────────────────────────────────────────────────────────
// TARIFA ANUAL ISR — PERSONAS FÍSICAS (art. 152 LISR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tarifa progresiva anual del ISR para personas físicas.
 *
 * Sistema de tramos marginales:
 *   ISR = cuota fija del tramo + (base gravable − límite inferior) × tasa marginal
 *
 * Valores basados en el ejercicio 2025 como referencia educativa.
 * Actualizar con Anexo 8 RMF 2026 cuando sea publicado en DOF.
 * Fuente: LISR art. 152
 * URL: https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
 *
 * Campos por tramo:
 *   lowerBound:   number — límite inferior (MXN)
 *   upperBound:   number — límite superior (MXN, Infinity para el último tramo)
 *   fixedFee:     number — cuota fija (MXN)
 *   marginalRate: number — tasa sobre el excedente (fracción decimal)
 */
const ANNUAL_ISR_TARIFF = [
  { lowerBound: 0.01,         upperBound: 8_952.49,       fixedFee: 0,             marginalRate: 0.0192 },
  { lowerBound: 8_952.50,     upperBound: 75_984.55,      fixedFee: 171.88,        marginalRate: 0.0640 },
  { lowerBound: 75_984.56,    upperBound: 133_536.07,     fixedFee: 4_461.94,      marginalRate: 0.1088 },
  { lowerBound: 133_536.08,   upperBound: 155_229.80,     fixedFee: 10_723.55,     marginalRate: 0.1600 },
  { lowerBound: 155_229.81,   upperBound: 185_852.57,     fixedFee: 14_194.54,     marginalRate: 0.1792 },
  { lowerBound: 185_852.58,   upperBound: 374_837.88,     fixedFee: 19_682.13,     marginalRate: 0.2136 },
  { lowerBound: 374_837.89,   upperBound: 590_795.99,     fixedFee: 60_049.40,     marginalRate: 0.2352 },
  { lowerBound: 590_796.00,   upperBound: 1_127_926.84,   fixedFee: 110_842.74,    marginalRate: 0.3000 },
  { lowerBound: 1_127_926.85, upperBound: 1_503_902.46,   fixedFee: 271_981.99,    marginalRate: 0.3200 },
  { lowerBound: 1_503_902.47, upperBound: 4_511_707.37,   fixedFee: 392_294.17,    marginalRate: 0.3400 },
  { lowerBound: 4_511_707.38, upperBound: Infinity,        fixedFee: 1_414_947.85,  marginalRate: 0.3500 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TASAS ISR RESICO — PERSONAS FÍSICAS (art. 113-E LISR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tasas directas del RESICO sobre ingresos cobrados (sin deducción de gastos).
 *
 * IMPORTANTE: Es una tasa plana por tramo, NO marginal.
 * Al cruzar un umbral, TODA la base paga la nueva tasa.
 *
 * Fuente: LISR art. 113-E
 * URL: https://www.sat.gob.mx/personas/resico-pf
 *
 * Campos:
 *   upperBound: number — límite superior del ingreso anual acumulado (MXN)
 *   rate:       number — tasa anual a aplicar sobre el total (fracción decimal)
 */
const RESICO_ISR_RATES = [
  { upperBound: 300_000,   rate: 0.0100 },
  { upperBound: 600_000,   rate: 0.0110 },
  { upperBound: 1_000_000, rate: 0.0130 },
  { upperBound: 2_000_000, rate: 0.0170 },
  { upperBound: 3_500_000, rate: 0.0250 },
];

// ─────────────────────────────────────────────────────────────────────────────
// MÁRGENES DE SEGURIDAD DEL BUFFER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multiplicadores de seguridad por tipo de obligación fiscal.
 *
 * El buffer incluye un margen sobre el ISR calculado para cubrir:
 * - Variabilidad del ingreso
 * - Ajustes en declaración anual
 * - Recargos por pago tardío
 *
 * Fuente: parámetro de producto basado en buenas prácticas contables.
 *
 * Interpretación: 1.20 = ISR calculado + 20% de reserva adicional.
 */
const BUFFER_SAFETY_MARGINS = {
  SUELDOS_Y_SALARIOS:                       1.05,
  ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL:    1.20,
  SERVICIOS_PROFESIONALES_REGIMEN_GENERAL:  1.20,
  ARRENDAMIENTO_REGIMEN_GENERAL:            1.15,
  ACTIVIDAD_EMPRESARIAL_RESICO:             1.10,
  SERVICIOS_PROFESIONALES_RESICO:           1.10,
  ARRENDAMIENTO_RESICO:                     1.10,
  DEFAULT:                                  1.15,
};

// ─────────────────────────────────────────────────────────────────────────────
// OBJETO PRINCIPAL EXPORTADO
// ─────────────────────────────────────────────────────────────────────────────

const FISCAL_CONSTANTS = {
  EXERCISE_YEAR,
  ANNUAL_UMA_VALUE_MXN,
  GENERAL_IVA_RATE,
  PROFESSIONAL_SERVICES_ISR_WITHHOLDING_RATE,
  RESICO_PROFESSIONAL_SERVICES_ISR_WITHHOLDING_RATE,
  PROFESSIONAL_SERVICES_IVA_WITHHOLDING_RATE,
  RESICO_ANNUAL_INCOME_LIMIT_MXN,
  BANKED_PAYMENT_THRESHOLD_MXN,
  LEGAL_DISCLAIMER,
  PERSONAL_DEDUCTIONS_GLOBAL_CAP,
  TUITION_ANNUAL_CAPS_MXN,
  PERSONAL_DEDUCTION_SPECIFIC_CAPS,
  INVESTMENT_DEDUCTION_RATES_BUSINESS,
  INVESTMENT_DEDUCTION_RATES_RENTAL,
  ANNUAL_ISR_TARIFF,
  RESICO_ISR_RATES,
  BUFFER_SAFETY_MARGINS,
};

module.exports = { FISCAL_CONSTANTS };
