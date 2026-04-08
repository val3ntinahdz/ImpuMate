'use strict';

/**
 * taxBufferCalculator.js  (refactorizado)
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ORIGINAL:
 * ─────────────────────────────────────────
 * 1. Constantes fiscales movidas a src/constants/fiscalConstants.js
 *    Antes: FISCAL_PARAMETERS_2026 definido aquí
 *    Ahora: importado como FISCAL_CONSTANTS
 *
 * 2. Catálogos importados desde src/constants/taxCatalogs.js
 *    Antes: OBLIGATIONS y INCOME_SOURCE_TYPES definidos aquí
 *    Ahora: importados desde taxCatalogs
 *
 * 3. usesBlindArrendamientoDeduction → usesBlindRentalDeduction
 *    Nombre unificado con el que usa expenseDeductionAdvisor.
 *
 * 4. IVA acreditable modelado con CATEGORIES_WITHOUT_IVA_ACREDITABLE
 *    Ahora el buffer descuenta el IVA acreditable estimado, evitando sobrestimación.
 *
 * FUNCIONALIDAD: idéntica a la versión original más la corrección del IVA acreditable.
 */

const { FISCAL_CONSTANTS } = require('../constants/fiscalConstants');
const {
  OBLIGATIONS,
  CATEGORIES_WITHOUT_IVA_ACREDITABLE,
} = require('../constants/taxCatalogs');

// ─────────────────────────────────────────────────────────────────────────────
// ESTRUCTURA BASE DEL RESULTADO
// ─────────────────────────────────────────────────────────────────────────────

function createBaseBufferResult() {
  return {
    grossIncomeByObligation:    {},
    taxableBaseByObligation:    {},
    estimatedISRByObligation:   {},
    estimatedIVACausado:        0,
    estimatedIVAAcreditable:    0,
    estimatedIVAOwed:           0,
    estimatedClientWithheldISR: 0,
    estimatedClientWithheldIVA: 0,
    totalTaxLiability:          0,
    remainingTaxAfterCredits:   0,
    totalWithSafetyMargin:      0,
    monthlyTaxLiability:        0,
    monthlyTaxLiabilityWithSafetyMargin: 0,
    recommendedMonthlyBuffer:   0,
    targetBufferFund:           0,
    bufferHorizonMonths:        0,
    safetyMarginApplied:        0,
    reasoning:                  [],
    warnings:                   [],
    missingData:                [],
    disclaimer:                 FISCAL_CONSTANTS.LEGAL_DISCLAIMER,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function validateBufferInput(input) {
  const missing = [];

  if (!input) { missing.push('input (objeto completo nulo)'); return missing; }

  if (!Array.isArray(input.currentObligations) || input.currentObligations.length === 0)
    missing.push('currentObligations (arreglo de obligaciones fiscales activas)');

  if (!Array.isArray(input.incomeSources) || input.incomeSources.length === 0) {
    missing.push('incomeSources (arreglo de fuentes de ingreso)');
  } else {
    input.incomeSources.forEach((src, i) => {
      if (typeof src.grossAnnualAmountMXN !== 'number' || src.grossAnnualAmountMXN < 0)
        missing.push(`incomeSources[${i}].grossAnnualAmountMXN`);
      if (!src.obligationType)
        missing.push(`incomeSources[${i}].obligationType`);
    });
  }

  if (
    typeof input.bufferHorizonMonths !== 'number' ||
    input.bufferHorizonMonths < 1 ||
    input.bufferHorizonMonths > 12
  )
    missing.push('bufferHorizonMonths (integer entre 1 y 12)');

  return missing;
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULOS AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica la tarifa anual del ISR (art. 152 LISR).
 * Sistema de tramos marginales: cuota fija + tasa × excedente del límite inferior.
 */
function applyAnnualISRTariff(taxableBaseMXN) {
  if (taxableBaseMXN <= 0) return 0;

  let bracket = FISCAL_CONSTANTS.ANNUAL_ISR_TARIFF[0];
  for (const current of FISCAL_CONSTANTS.ANNUAL_ISR_TARIFF) {
    if (taxableBaseMXN >= current.lowerBound) bracket = current;
    else break;
  }

  const excess   = taxableBaseMXN - bracket.lowerBound;
  const marginal = excess * bracket.marginalRate;
  return Math.max(bracket.fixedFee + marginal, 0);
}

function applyMonthlyISRTariff(taxableBaseMXN) {
  if(taxableBaseMXN <= 0) return 0;

  let bracket = FISCAL_CONSTANTS.MONTHLY_ISR_TARIFF[0];
  for (const current of FISCAL_CONSTANTS.MONTHLY_ISR_TARIFF) {
    if (taxableBaseMXN >= current.lowerBound) bracket = current;
    else break;
  }

  const excess   = taxableBaseMXN - bracket.lowerBound;
  const marginal = excess * bracket.marginalRate;
  return Math.max(bracket.fixedFee + marginal, 0);
}

/**
 * Aplica la tasa directa del RESICO (art. 113-E LISR).
 * Tasa plana por tramo sobre ingresos cobrados, SIN deducción de gastos.
 * IMPORTANTE: al cruzar un umbral, toda la base paga la nueva tasa (no solo el excedente).
 */
function applyRESICORate(totalCollectedMXN) {
  if (totalCollectedMXN <= 0) return 0;

  const applicable = FISCAL_CONSTANTS.RESICO_ISR_RATES.find(
    (bracket) => totalCollectedMXN <= bracket.upperBound,
  );

  const rate = applicable
    ? applicable.rate
    : FISCAL_CONSTANTS.RESICO_ISR_RATES[FISCAL_CONSTANTS.RESICO_ISR_RATES.length - 1].rate;

  return totalCollectedMXN * rate;
}

/**
 * Agrega ingresos brutos por tipo de obligación.
 */
function aggregateIncomeByObligation(incomeSources) {
  return incomeSources.reduce((acc, src) => {
    acc[src.obligationType] = (acc[src.obligationType] || 0) + src.grossAnnualAmountMXN;
    return acc;
  }, {});
}

function estimateClientRetentions(incomeSources) {
  return incomeSources.reduce((totals, src) => {
    const annualIncome = Math.max(src.grossAnnualAmountMXN || 0, 0);

    if (src.clientRetainsISR) {
      if (src.obligationType === OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL) {
        totals.isr += annualIncome * FISCAL_CONSTANTS.PROFESSIONAL_SERVICES_ISR_WITHHOLDING_RATE;
      } else if (src.obligationType === OBLIGATIONS.SERVICIOS_PROFESIONALES_RESICO) {
        totals.isr += annualIncome * FISCAL_CONSTANTS.RESICO_PROFESSIONAL_SERVICES_ISR_WITHHOLDING_RATE;
      }
    }

    if (src.clientRetainsIVA && src.isSubjectToIVA) {
      const annualIva = annualIncome * FISCAL_CONSTANTS.GENERAL_IVA_RATE;
      totals.iva += annualIva * FISCAL_CONSTANTS.PROFESSIONAL_SERVICES_IVA_WITHHOLDING_RATE;
    }

    return totals;
  }, { isr: 0, iva: 0 });
}

/**
 * Distribuye deducciones aprobadas entre obligaciones elegibles.
 *
 * Reglas:
 * - Deducciones personales → obligaciones NO-RESICO, pro-rata por ingreso
 * - Deducciones de actividad → obligaciones de régimen general, pro-rata por ingreso
 * - RESICO → no recibe ninguna deducción para ISR
 */
function distributeDeductions(
  personalDeductiblesMXN,
  activityDeductiblesMXN,
  incomeByObligation,
  currentObligations,
) {
  const deductions = Object.fromEntries(currentObligations.map((o) => [o, 0]));

  // Deducciones de actividad
  const activityObligations = currentObligations.filter((o) =>
    [
      OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL,
      OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL,
      OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL,
    ].includes(o),
  );

  if (activityObligations.length > 0 && activityDeductiblesMXN > 0) {
    const totalActivityIncome = activityObligations.reduce(
      (sum, o) => sum + (incomeByObligation[o] || 0), 0,
    );
    for (const o of activityObligations) {
      if (totalActivityIncome > 0)
        deductions[o] += activityDeductiblesMXN * ((incomeByObligation[o] || 0) / totalActivityIncome);
    }
  }

  // Deducciones personales
  const nonResicoObligations = currentObligations.filter((o) => !o.includes('RESICO'));

  if (nonResicoObligations.length > 0 && personalDeductiblesMXN > 0) {
    const totalNonResicoIncome = nonResicoObligations.reduce(
      (sum, o) => sum + (incomeByObligation[o] || 0), 0,
    );
    for (const o of nonResicoObligations) {
      if (totalNonResicoIncome > 0)
        deductions[o] += personalDeductiblesMXN * ((incomeByObligation[o] || 0) / totalNonResicoIncome);
    }
  }

  return deductions;
}

/**
 * Calcula la base gravable ISR por obligación.
 * Base gravable = ingreso bruto − deducciones asignadas (mínimo 0).
 */
function calculateTaxableBase(incomeByObligation, deductionsByObligation) {
  const taxableBaseObj = {};
  for (const obligation in incomeByObligation) {
    taxableBaseObj[obligation] = Math.max(
      (incomeByObligation[obligation] || 0) - (deductionsByObligation[obligation] || 0),
      0,
    );
  }
  return taxableBaseObj;
}

/**
 * Calcula ISR estimado por obligación usando la tarifa o tasa correcta.
 */
function calculateISRByObligation(taxableBaseByObligation, incomeByObligation) {
  return Object.fromEntries(
    Object.entries(taxableBaseByObligation).map(([obligation, base]) => {
      const isRESICO =
        obligation === OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_RESICO ||
        obligation === OBLIGATIONS.SERVICIOS_PROFESIONALES_RESICO ||
        obligation === OBLIGATIONS.ARRENDAMIENTO_RESICO;

      return [
        obligation,
        isRESICO
          ? applyRESICORate(incomeByObligation[obligation] || 0)
          : applyAnnualISRTariff(base),
      ];
    }),
  );
}

function calculateMonthlyISRByObligation(monthlyIncomeSources) {
  const result = {};
  for (const incomeSource of monthlyIncomeSources) {
    if (incomeSource.obligationType === OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL) {
      result[incomeSource.obligationType] = incomeSource.grossMonthlyAmountMXN * FISCAL_CONSTANTS.PROFESSIONAL_SERVICES_ISR_WITHHOLDING_RATE;
      continue;
    }
    result[incomeSource.obligationType] = applyMonthlyISRTariff(incomeSource.grossMonthlyAmountMXN);
  }
  return result;
}

function calculateAnnualISR(incomeSources, deductibleExpenses) {
  let taxableBase = 0;
  for (const incomeSource of incomeSources)
    taxableBase += incomeSource.grossAnnualAmountMXN;
  taxableBase -= deductibleExpenses.personalDeductibles;
  taxableBase -= deductibleExpenses.activityDeductibles;
  return applyAnnualISRTariff(Math.max(taxableBase, 0));
}

/**
 * Obtiene el margen de seguridad para una obligación.
 */
function getSafetyMargin(obligation) {
  return FISCAL_CONSTANTS.BUFFER_SAFETY_MARGINS[obligation] ||
         FISCAL_CONSTANTS.BUFFER_SAFETY_MARGINS.DEFAULT;
}

/**
 * Aplica márgenes de seguridad al ISR y al IVA pendiente.
 */
function applySecurityMargins(isrByObligation, ivaOwed) {
  const reasoning = [];
  let totalISRBase   = 0;
  let totalWithMargin= 0;

  for (const [obligation, isr] of Object.entries(isrByObligation)) {
    const margin       = getSafetyMargin(obligation);
    const isrWithMargin= isr * margin;
    totalISRBase      += isr;
    totalWithMargin   += isrWithMargin;
    reasoning.push(
      `[Margen] ${obligation}: ISR $${isr.toFixed(2)} × ${((margin - 1) * 100).toFixed(0)}% = $${isrWithMargin.toFixed(2)} MXN.`,
    );
  }

  const defaultMargin = FISCAL_CONSTANTS.BUFFER_SAFETY_MARGINS.DEFAULT;
  const ivaWithMargin = ivaOwed * defaultMargin;
  totalWithMargin    += ivaWithMargin;

  if (ivaOwed > 0)
    reasoning.push(
      `[Margen] IVA pendiente $${ivaOwed.toFixed(2)} × ${((defaultMargin - 1) * 100).toFixed(0)}% = $${ivaWithMargin.toFixed(2)} MXN.`,
    );

  const avgMargin = (totalISRBase + ivaOwed) > 0
    ? totalWithMargin / (totalISRBase + ivaOwed)
    : defaultMargin;

  return { totalWithMargin, avgMargin, reasoning };
}

function calculateIVA(monthlyIncomeSources) {
  let iva = 0;
  for(let incomeSource of monthlyIncomeSources)
  {
    if(incomeSource.obligationType === 'SERVICIOS_PROFESIONALES_REGIMEN_GENERAL')
    {
      iva += incomeSource.grossMonthlyAmountMXN * FISCAL_CONSTANTS.GENERAL_IVA_RATE;
    }
  }
  return iva;
}

function calculateWithheldIVA(iva) {
  return iva * FISCAL_CONSTANTS.PROFESSIONAL_SERVICES_IVA_WITHHOLDING_RATE;
}

function calculateDueIVA(iva, withheldIVA) {
  return iva - withheldIVA;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateTaxBuffer
 *
 * Calcula el monto mensual que el usuario debe apartar para cubrir sus impuestos.
 *
 * INPUT:
 * ──────
 * input.currentObligations  {string[]}  — obligaciones fiscales activas
 * input.incomeSources        {object[]}  — fuentes de ingreso:
 *   - obligationType:          string   — tipo de obligación
 *   - grossAnnualAmountMXN:    number   — ingreso bruto anual (MXN)
 *   - isSubjectToIVA:          boolean  — ¿causa IVA esta actividad?
 *   - clientRetainsISR:        boolean  — ¿el cliente retiene ISR?
 *   - clientRetainsIVA:        boolean  — ¿el cliente retiene IVA?
 * input.annualContext         {object}   — contexto del ejercicio:
 *   - totalApprovedPersonalDeductiblesMXN:  number — del Deductibles Calculator
 *   - totalApprovedActivityDeductiblesMXN:  number — del Deductibles Calculator
 *   - totalEstimatedIVAAcreditableMXN:      number — del Deductions Accumulator
 *   - isrAlreadyWithheldBySalaryMXN:        number — retenido por empleador
 *   - ivaAlreadyPaidToSATMXN:               number — ya enterado en provisionales
 * input.bufferHorizonMonths   {integer}  — meses objetivo para el colchón (1–12)
 *
 * OUTPUT:
 * ───────
 * result.recommendedMonthlyBuffer  — ★ provisión mensual promedio sugerida (MXN/mes)
 * result.targetBufferFund          — meta de colchón usando el horizonte elegido
 * result.estimatedISRByObligation  — ISR por obligación
 * result.estimatedIVAOwed          — IVA pendiente neto
 * result.totalTaxLiability         — pasivo bruto (ISR + IVA)
 * result.totalWithSafetyMargin     — pasivo con margen de seguridad
 * result.reasoning                 — pasos explicados
 * result.warnings                  — advertencias
 * result.disclaimer                — aviso legal
 */
function calculateTaxBuffer(input) {
  const result = createBaseBufferResult();

  const { currentObligations, incomeSources, annualContext } = input;
  const deductibleExpenses = {
    personalDeductibles: Math.max(annualContext.totalApprovedPersonalDeductiblesMXN  || 0, 0),
    activityDeductibles: Math.max(annualContext.totalApprovedActivityDeductiblesMXN  || 0, 0)
  }
  const monthlyIncomeSources = [];
  for(let incomeSource of incomeSources)
  {
    monthlyIncomeSources.push({
      obligationType: incomeSource.obligationType,
      grossMonthlyAmountMXN: incomeSource.grossAnnualAmountMXN / 12
    });
  }
  // STEP 1 - Calculate Annual ISR
  const annualISR = calculateAnnualISR(incomeSources, deductibleExpenses);
  result.annualISR = annualISR;

  // STEP 2 - Calculate Monthly ISR per income source
  const monthlyISRperIncome = calculateMonthlyISRByObligation(monthlyIncomeSources);
  result.monthlyIncomeSources = monthlyIncomeSources;
  result.monthlyISRperIncome = monthlyISRperIncome;
  let annualWithheldISRperIncome = {};
  for(let income in monthlyISRperIncome) {
    annualWithheldISRperIncome[income] = monthlyISRperIncome[income] * 12;
  }
  result.annualWithheldISRperIncome = annualWithheldISRperIncome;

  // STEP 3 - How many taxes will I pay for the current fiscal session?
  let dueTaxes = annualISR;
  for(let obligation in monthlyISRperIncome)
    dueTaxes -= monthlyISRperIncome[obligation] * 12;
  result.dueTaxes = dueTaxes;
  result.dueTaxesMonthly = dueTaxes / 12;

  // STEP 4 - Calculate IVA
  let IVA = calculateIVA(monthlyIncomeSources); // Monthly IVA
  result.IVA = IVA;

  // STEP 5 - Withheld IVA
  let withheldIVA = calculateWithheldIVA(IVA);
  result.withheldIVA = withheldIVA;

  // STEP 6 - Due IVA
  let dueIVA = calculateDueIVA(IVA, withheldIVA);
  result.dueIVA = dueIVA;

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  calculateTaxBuffer,
  // auxiliares para testing
  applyAnnualISRTariff,
  applyRESICORate,
  aggregateIncomeByObligation,
  distributeDeductions,
  calculateTaxableBase,
  calculateISRByObligation,
};
