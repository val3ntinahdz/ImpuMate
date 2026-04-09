'use strict';

/**
 * deductionsAccumulator.js
 *
 * PROPÓSITO:
 * Este módulo es el conector entre expenseDeductionAdvisor y taxBufferCalculator.
 *
 * Resuelve el problema del estado compartido:
 * - El módulo de deducibles evalúa gastos UNO POR UNO.
 * - El módulo de buffer necesita TOTALES acumulados.
 * - Alguien tiene que mantener el estado entre evaluaciones individuales.
 *   Ese alguien es este acumulador.
 *
 * También resuelve el problema del tope global acumulativo:
 * - La regla del tope global (5 UMA o 15% del ingreso) es acumulativa.
 * - Cada gasto aprobado consume parte del tope disponible para el siguiente.
 * - El acumulador mantiene ese contador entre evaluaciones.
 *
 * FLUJO DE USO:
 *
 *   const acc = createDeductionsAccumulator(annualContext);
 *
 *   for (const expense of userExpenses) {
 *     acc.evaluate(expense, currentObligations);
 *   }
 *
 *   const summary = acc.getSummary();
 *   // summary.totalPersonalDeductiblesMXN  → al Buffer Calculator
 *   // summary.totalActivityDeductiblesMXN  → al Buffer Calculator
 *   // summary.totalIVAAcreditableMXN       → al Buffer Calculator
 *   // summary.approvedExpenses             → para mostrar al usuario
 *   // summary.rejectedExpenses             → para mostrar al usuario
 */

const { FISCAL_CONSTANTS }              = require('../constants/fiscalConstants');
const { DEDUCTION_KINDS, CATEGORIES_WITHOUT_IVA_ACREDITABLE } = require('../constants/taxCatalogs');
const { evaluateExpenseDeductibility }  = require('../modules/expenseDeductionAdvisor');

/**
 * Determina si un gasto aprobado genera IVA acreditable.
 * Solo gastos de actividad con CFDI y no en la lista de exentos.
 *
 * @param {object} expense    — datos del gasto
 * @param {string} deductionKind — tipo de deducción resultante
 * @returns {boolean}
 */
function isEligibleForIVAAcreditable(expense, deductionKind) {
  // Solo gastos de actividad empresarial / arrendamiento (no personales)
  const activityKinds = [
    DEDUCTION_KINDS.BUSINESS_CURRENT_PERIOD,
    DEDUCTION_KINDS.BUSINESS_ANNUAL_INVESTMENT,
    DEDUCTION_KINDS.ARR_CURRENT_PERIOD,
    DEDUCTION_KINDS.ARR_ANNUAL_INVESTMENT,
  ];
  if (!activityKinds.includes(deductionKind)) return false;

  // La categoría no debe estar en la lista de exentas de IVA
  if (CATEGORIES_WITHOUT_IVA_ACREDITABLE.has(expense.category)) return false;

  // Debe tener CFDI (sin factura no hay IVA acreditable)
  if (!expense.hasCFDI) return false;

  return true;
}

/**
 * createDeductionsAccumulator
 *
 * Crea una instancia del acumulador para una sesión de evaluación de gastos.
 *
 * @param {object} annualContext — contexto fiscal anual del usuario:
 *   - annualTotalIncomeMXN:                       number
 *   - annualUMAValueMXN:                          number (default: valor oficial 2026)
 *   - currentYearAccumIncomeForRetirementCapMXN:  number
 *   - previousYearAccumIncomeForDonationCapMXN:   number
 *   - usesBlindRentalDeduction:                   boolean
 *
 * @returns {object} — instancia del acumulador con métodos evaluate() y getSummary()
 */
function createDeductionsAccumulator(annualContext = {}) {
  // Estado interno del acumulador
  const state = {
    // Tope global de deducciones personales ya consumido
    consumedGlobalPersonalCapMXN: 0,

    // Totales para el Buffer Calculator
    totalPersonalDeductiblesMXN:  0,
    totalActivityDeductiblesMXN:  0,
    totalIVAAcreditableMXN:       0,

    // Listas para mostrar al usuario
    approvedExpenses:  [],
    rejectedExpenses:  [],
  };

  // Contexto normalizado que se pasa a cada evaluación
  const normalizedContext = {
    annualTotalIncomeMXN:                      annualContext.annualTotalIncomeMXN || 0,
    annualUMAValueMXN:                         annualContext.annualUMAValueMXN || FISCAL_CONSTANTS.ANNUAL_UMA_VALUE_MXN,
    currentYearAccumIncomeForRetirementCapMXN: annualContext.currentYearAccumIncomeForRetirementCapMXN || 0,
    previousYearAccumIncomeForDonationCapMXN:  annualContext.previousYearAccumIncomeForDonationCapMXN || 0,
    usesBlindRentalDeduction:                  Boolean(annualContext.usesBlindRentalDeduction),
    // El cap consumido se actualiza dinámicamente con cada evaluación
    alreadyConsumedGlobalPersonalCapMXN:       0,
  };

  return {
    /**
     * evaluate
     *
     * Evalúa un gasto y lo acumula si es aprobado.
     * Actualiza automáticamente el tope global consumido para la siguiente evaluación.
     *
     * @param {object}   expense            — datos del gasto (category, amountMXN, etc.)
     * @param {string[]} currentObligations — obligaciones fiscales del usuario
     * @returns {object} — resultado de la evaluación (mismo formato que evaluateExpenseDeductibility)
     */
    evaluate(expense, currentObligations) {
      // Inyectar el cap consumido actual antes de evaluar
      normalizedContext.alreadyConsumedGlobalPersonalCapMXN = state.consumedGlobalPersonalCapMXN;

      const evalResult = evaluateExpenseDeductibility({
        currentObligations,
        annualContext: normalizedContext,
        expense,
      });

      if (evalResult.deductibleForISR) {
        // Acumular según tipo de deducción
        if (evalResult.deductionKind === DEDUCTION_KINDS.PERSONAL_ANNUAL) {
          state.totalPersonalDeductiblesMXN  += evalResult.deductibleAmountMXN;
          state.consumedGlobalPersonalCapMXN += evalResult.deductibleAmountMXN;
        } else {
          state.totalActivityDeductiblesMXN  += evalResult.deductibleAmountMXN;
        }

        // Acumular IVA acreditable estimado si aplica
        if (isEligibleForIVAAcreditable(expense, evalResult.deductionKind)) {
          state.totalIVAAcreditableMXN += evalResult.deductibleAmountMXN * FISCAL_CONSTANTS.GENERAL_IVA_RATE;
        }

        state.approvedExpenses.push({
          expense,
          deductibleAmountMXN:  evalResult.deductibleAmountMXN,
          deductionKind:        evalResult.deductionKind,
          capDescription:       evalResult.capAppliedDescription,
        });
      } else {
        state.rejectedExpenses.push({
          expense,
          reasons: evalResult.reasons,
          missingData: evalResult.missingData,
        });
      }

      return evalResult;
    },

    /**
     * getSummary
     *
     * Devuelve el resumen acumulado listo para pasar al Buffer Calculator.
     *
     * @returns {object}
     *   - totalPersonalDeductiblesMXN  {number} — para annualContext del buffer
     *   - totalActivityDeductiblesMXN  {number} — para annualContext del buffer
     *   - totalIVAAcreditableMXN       {number} — para annualContext del buffer
     *   - approvedExpenses             {object[]} — para mostrar al usuario
     *   - rejectedExpenses             {object[]} — para mostrar al usuario
     *   - approvedCount                {number}
     *   - rejectedCount                {number}
     *   - totalDeductiblesMXN          {number} — suma total (personal + actividad)
     */
    getSummary() {
      return {
        totalPersonalDeductiblesMXN: state.totalPersonalDeductiblesMXN,
        totalActivityDeductiblesMXN: state.totalActivityDeductiblesMXN,
        totalIVAAcreditableMXN:      state.totalIVAAcreditableMXN,
        totalDeductiblesMXN:         state.totalPersonalDeductiblesMXN + state.totalActivityDeductiblesMXN,
        approvedExpenses:            [...state.approvedExpenses],
        rejectedExpenses:            [...state.rejectedExpenses],
        approvedCount:               state.approvedExpenses.length,
        rejectedCount:               state.rejectedExpenses.length,
      };
    },

    /**
     * reset
     * Reinicia el acumulador para una nueva sesión o nuevo período.
     */
    reset() {
      state.consumedGlobalPersonalCapMXN = 0;
      state.totalPersonalDeductiblesMXN  = 0;
      state.totalActivityDeductiblesMXN  = 0;
      state.totalIVAAcreditableMXN       = 0;
      state.approvedExpenses             = [];
      state.rejectedExpenses             = [];
      normalizedContext.alreadyConsumedGlobalPersonalCapMXN = 0;
    },
  };
}

module.exports = { createDeductionsAccumulator };
