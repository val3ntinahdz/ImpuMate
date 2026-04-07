'use strict';

/**
 * expenseDeductionAdvisor.js  (refactorizado)
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ORIGINAL:
 * ─────────────────────────────────────────
 * 1. Constantes fiscales movidas a src/constants/fiscalConstants.js
 *    Antes: OFFICIAL_PARAMETERS_2026 definido aquí
 *    Ahora: importado como FISCAL_CONSTANTS
 *
 * 2. Catálogos movidos a src/constants/taxCatalogs.js
 *    Antes: OBLIGATIONS, EXPENSE_CATEGORIES, PAYMENT_METHODS definidos aquí
 *    Ahora: importados desde taxCatalogs
 *
 * 3. DEDUCTION_KINDS centralizado en taxCatalogs
 *    Antes: strings literales dispersos ('PERSONAL_ANNUAL', etc.)
 *    Ahora: referenciados desde DEDUCTION_KINDS
 *
 * FUNCIONALIDAD: idéntica a la versión original.
 */

const { FISCAL_CONSTANTS } = require('../constants/fiscalConstants');
const {
  OBLIGATIONS,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  DEDUCTION_KINDS,
  CATEGORIES_WITHOUT_IVA_ACREDITABLE,
} = require('../constants/taxCatalogs');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE CLASIFICACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve true si el usuario tributa en cualquier variante RESICO.
 * @param {string[]} currentObligations
 * @returns {boolean}
 */
function hasAnyRESICO(currentObligations) {
  return currentObligations.some((o) => o.includes('RESICO'));
}

/**
 * Devuelve true si las obligaciones actuales habilitan deducciones personales.
 * Regla conservadora: si hay RESICO, no aplican deducciones personales.
 * @param {string[]} currentObligations
 * @returns {boolean}
 */
function canUsePersonalDeductions(currentObligations) {
  if (hasAnyRESICO(currentObligations)) return false;

  const eligible = new Set([
    OBLIGATIONS.SUELDOS_Y_SALARIOS,
    OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL,
    OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL,
    OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL,
  ]);

  return currentObligations.some((o) => eligible.has(o));
}

/**
 * Calcula el tope global de deducciones personales para el ejercicio.
 * Aplica el menor entre: 5 UMA anuales o 15% del ingreso total.
 * Fuente: SAT minisitio deducciones personales
 * @param {number} annualTotalIncomeMXN
 * @param {number} annualUMAValueMXN
 * @returns {number}
 */
function calculateGlobalPersonalDeductionsCap(annualTotalIncomeMXN, annualUMAValueMXN) {
  const capByUMA    = FISCAL_CONSTANTS.PERSONAL_DEDUCTIONS_GLOBAL_CAP.umaMultiplier * annualUMAValueMXN;
  const capByIncome = FISCAL_CONSTANTS.PERSONAL_DEDUCTIONS_GLOBAL_CAP.incomePercentage * annualTotalIncomeMXN;
  return Math.min(capByUMA, capByIncome);
}

/**
 * Indica si el método de pago es bancarizado.
 * @param {string} paymentMethod
 * @returns {boolean}
 */
function isBankedPayment(paymentMethod) {
  return [
    PAYMENT_METHODS.TRANSFER,
    PAYMENT_METHODS.CREDIT_CARD,
    PAYMENT_METHODS.DEBIT_CARD,
    PAYMENT_METHODS.SERVICE_CARD,
    PAYMENT_METHODS.NOMINATIVE_CHECK,
  ].includes(paymentMethod);
}

/**
 * Indica si el beneficiario pertenece al círculo familiar permitido.
 * @param {string|null} relationship
 * @returns {boolean}
 */
function isAllowedPersonalBeneficiary(relationship) {
  return new Set([
    'SELF', 'SPOUSE', 'CONCUBINE_OR_CONCUBINARY',
    'PARENT', 'GRANDPARENT', 'CHILD', 'GRANDCHILD',
  ]).has(relationship);
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTRUCTURA BASE DEL RESULTADO
// ─────────────────────────────────────────────────────────────────────────────

function createBaseResult() {
  return {
    deductibleForISR:               false,
    deductionKind:                  DEDUCTION_KINDS.NOT_DEDUCTIBLE,
    deductibleAmountMXN:            0,
    deductiblePercentageOverExpense:0,
    capAppliedDescription:          null,
    reasons:                        [],
    warnings:                       [],
    missingData:                    [],
    officialSourceNotes:            [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIONES COMUNES
// ─────────────────────────────────────────────────────────────────────────────

function validateCommonPersonalRequirements(expense, result) {
  if (!expense.hasCFDI)
    result.reasons.push('No hay CFDI / factura.');
  if (!expense.invoiceReceiverRFCMatchesTaxpayer)
    result.reasons.push('RFC del receptor no coincide con el contribuyente.');
  if (!isBankedPayment(expense.paymentMethod))
    result.reasons.push('Pago en efectivo no procede para deducciones personales.');
  if (!expense.paidFromTaxpayerAccount)
    result.reasons.push('El pago debe salir de cuenta del contribuyente.');
  if (!expense.paidInRelevantFiscalYear)
    result.reasons.push('La deducción debe corresponder al mismo ejercicio fiscal.');
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUADORES POR CATEGORÍA
// ─────────────────────────────────────────────────────────────────────────────

function evaluatePersonalMedicalDeduction({ annualContext, expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.PERSONAL_ANNUAL;

  validateCommonPersonalRequirements(expense, result);

  if (!isAllowedPersonalBeneficiary(expense.beneficiaryRelationship))
    result.reasons.push('Beneficiario no permitido.');

  if (
    expense.category === EXPENSE_CATEGORIES.PERSONAL_MEDICAL &&
    !expense.providerHasRequiredProfessionalLicense
  )
    result.reasons.push('Prestador sin título profesional válido.');

  if (expense.category === EXPENSE_CATEGORIES.PERSONAL_MEDICAL_DISABILITY) {
    if (!expense.disabilityCertificate) {
      result.reasons.push('Falta certificado de incapacidad/discapacidad.');
      return result;
    }
    if (typeof expense.disabilityPercentage === 'number' && expense.disabilityPercentage < 50) {
      result.reasons.push('Se requiere al menos 50% de discapacidad reconocida.');
      return result;
    }
    if (result.reasons.length > 0) return result;
    result.deductibleForISR               = true;
    result.deductibleAmountMXN            = expense.amountMXN;
    result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : 1;
    result.capAppliedDescription          = 'Discapacidad: 100% del gasto, fuera del tope global.';
    result.officialSourceNotes.push('SAT gastos médicos y hospitalarios.');
    return result;
  }

  if (result.reasons.length > 0) return result;

  const globalCap       = calculateGlobalPersonalDeductionsCap(
    annualContext.annualTotalIncomeMXN,
    annualContext.annualUMAValueMXN,
  );
  const remainingCap    = Math.max(globalCap - (annualContext.alreadyConsumedGlobalPersonalCapMXN || 0), 0);
  let   deductible      = expense.amountMXN;

  if (expense.category === EXPENSE_CATEGORIES.PERSONAL_OPTICAL_LENSES)
    deductible = Math.min(deductible, FISCAL_CONSTANTS.PERSONAL_DEDUCTION_SPECIFIC_CAPS.opticalLensesCapMXN);

  deductible = Math.min(deductible, remainingCap);

  result.deductibleForISR               = deductible > 0;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : deductible / expense.amountMXN;
  result.capAppliedDescription          = `Tope global remanente: $${remainingCap.toFixed(2)} MXN.`;
  result.officialSourceNotes.push('SAT deducciones personales / gastos médicos.');
  return result;
}

function evaluatePersonalTuitionDeduction({ annualContext, expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.PERSONAL_ANNUAL;

  validateCommonPersonalRequirements(expense, result);
  if (!expense.schoolLevel)               result.missingData.push('schoolLevel');
  if (!expense.hasOfficialSchoolRecognition) result.reasons.push('Institución sin reconocimiento oficial.');
  if (!isAllowedPersonalBeneficiary(expense.beneficiaryRelationship)) result.reasons.push('Beneficiario no permitido.');

  const cap = FISCAL_CONSTANTS.TUITION_ANNUAL_CAPS_MXN[expense.schoolLevel || ''];
  if (!cap) result.reasons.push('Nivel educativo no válido.');

  if (result.reasons.length > 0 || result.missingData.length > 0) return result;

  const deductible = Math.min(expense.amountMXN, cap);
  result.deductibleForISR               = deductible > 0;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : deductible / expense.amountMXN;
  result.capAppliedDescription          = `Colegiaturas ${expense.schoolLevel}: tope $${cap.toLocaleString()} MXN.`;
  result.officialSourceNotes.push('SAT colegiaturas.');
  return result;
}

function evaluateSchoolTransportDeduction({ annualContext, expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.PERSONAL_ANNUAL;

  validateCommonPersonalRequirements(expense, result);
  if (!expense.schoolTransportMandatory)  result.reasons.push('Transporte no marcado como obligatorio.');
  if (!expense.invoiceSeparatesTransport) result.reasons.push('Factura no separa el transporte.');
  if (!isAllowedPersonalBeneficiary(expense.beneficiaryRelationship)) result.reasons.push('Beneficiario no permitido.');

  if (result.reasons.length > 0) return result;

  const globalCap    = calculateGlobalPersonalDeductionsCap(annualContext.annualTotalIncomeMXN, annualContext.annualUMAValueMXN);
  const remainingCap = Math.max(globalCap - (annualContext.alreadyConsumedGlobalPersonalCapMXN || 0), 0);
  const deductible   = Math.min(expense.amountMXN, remainingCap);

  result.deductibleForISR               = deductible > 0;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : deductible / expense.amountMXN;
  result.capAppliedDescription          = `Transporte escolar: tope global remanente $${remainingCap.toFixed(2)} MXN.`;
  result.officialSourceNotes.push('SAT transporte escolar.');
  return result;
}

function evaluateFuneralDeduction({ annualContext, expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.PERSONAL_ANNUAL;

  validateCommonPersonalRequirements(expense, result);
  if (!isAllowedPersonalBeneficiary(expense.beneficiaryRelationship)) result.reasons.push('Beneficiario no permitido.');

  if (result.reasons.length > 0) return result;

  const funeralCap   = FISCAL_CONSTANTS.PERSONAL_DEDUCTION_SPECIFIC_CAPS.funeralCapUMAMultiplier * annualContext.annualUMAValueMXN;
  const globalCap    = calculateGlobalPersonalDeductionsCap(annualContext.annualTotalIncomeMXN, annualContext.annualUMAValueMXN);
  const remainingCap = Math.max(globalCap - (annualContext.alreadyConsumedGlobalPersonalCapMXN || 0), 0);
  const deductible   = Math.min(expense.amountMXN, funeralCap, remainingCap);

  result.deductibleForISR               = deductible > 0;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : deductible / expense.amountMXN;
  result.capAppliedDescription          = `Funerarios: máx 1 UMA ($${funeralCap.toFixed(2)}), tope global $${remainingCap.toFixed(2)} MXN.`;
  result.officialSourceNotes.push('SAT gastos funerarios.');
  return result;
}

function evaluateDonationDeduction({ annualContext, expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.PERSONAL_ANNUAL;

  validateCommonPersonalRequirements(expense, result);
  if (expense.donationIsOnerousOrRemunerative) result.reasons.push('Donativo oneroso/remunerativo no deducible.');
  if (!expense.donationRecipientType) result.missingData.push('donationRecipientType');

  const validRecipients = ['AUTHORIZED_DONATARIA', 'FEDERATION_STATE_MUNICIPALITY_OR_DECENTRALIZED'];
  if (!validRecipients.includes(expense.donationRecipientType))
    result.reasons.push('Receptor no reconocido por SAT.');

  if (result.reasons.length > 0 || result.missingData.length > 0) return result;

  const pct       = expense.donationRecipientType === 'FEDERATION_STATE_MUNICIPALITY_OR_DECENTRALIZED'
    ? FISCAL_CONSTANTS.PERSONAL_DEDUCTION_SPECIFIC_CAPS.donationCapGovernmentPercentage
    : FISCAL_CONSTANTS.PERSONAL_DEDUCTION_SPECIFIC_CAPS.donationCapGeneralPercentage;
  const cap       = (annualContext.previousYearAccumIncomeForDonationCapMXN || 0) * pct;
  const deductible= Math.min(expense.amountMXN, cap);

  result.deductibleForISR               = deductible > 0;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : deductible / expense.amountMXN;
  result.capAppliedDescription          = `Donativos: ${(pct * 100).toFixed(0)}% del ingreso anterior. Tope: $${cap.toFixed(2)} MXN.`;
  result.officialSourceNotes.push('SAT donativos.');
  return result;
}

function evaluateRetirementContributionDeduction({ annualContext, expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.PERSONAL_ANNUAL;

  validateCommonPersonalRequirements(expense, result);
  if (!expense.meetsRetirementPermanenceRequirement)
    result.reasons.push('No cumple requisito de permanencia para retiro.');

  if (result.reasons.length > 0) return result;

  const capByIncome = FISCAL_CONSTANTS.PERSONAL_DEDUCTION_SPECIFIC_CAPS.retirementCapIncomePercentage *
    (annualContext.currentYearAccumIncomeForRetirementCapMXN || 0);
  const capByUMA    = FISCAL_CONSTANTS.PERSONAL_DEDUCTION_SPECIFIC_CAPS.retirementCapUMAMultiplier *
    annualContext.annualUMAValueMXN;
  const cap         = Math.min(capByIncome, capByUMA);
  const deductible  = Math.min(expense.amountMXN, cap);

  result.deductibleForISR               = deductible > 0;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : deductible / expense.amountMXN;
  result.capAppliedDescription          = `Retiro: menor entre $${capByIncome.toFixed(2)} (10% ingreso) y $${capByUMA.toFixed(2)} (5 UMA).`;
  result.officialSourceNotes.push('SAT aportaciones complementarias para el retiro.');
  return result;
}

function evaluateMortgageRealInterestDeduction({ annualContext, expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.PERSONAL_ANNUAL;

  validateCommonPersonalRequirements(expense, result);
  if (!expense.interestAmountIsRealInterest)       result.reasons.push('Solo se deducen intereses reales.');
  if (!expense.mortgageCreditWithin750kUdisLimit)  result.reasons.push('Crédito rebasa límite de 750,000 UDIS.');

  if (result.reasons.length > 0) return result;

  const globalCap    = calculateGlobalPersonalDeductionsCap(annualContext.annualTotalIncomeMXN, annualContext.annualUMAValueMXN);
  const remainingCap = Math.max(globalCap - (annualContext.alreadyConsumedGlobalPersonalCapMXN || 0), 0);
  const deductible   = Math.min(expense.amountMXN, remainingCap);

  result.deductibleForISR               = deductible > 0;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : deductible / expense.amountMXN;
  result.capAppliedDescription          = `Intereses hipotecarios: tope global remanente $${remainingCap.toFixed(2)} MXN.`;
  result.officialSourceNotes.push('SAT créditos hipotecarios.');
  return result;
}

function evaluateGeneralBusinessDeduction({ expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.BUSINESS_CURRENT_PERIOD;

  if (!expense.isStrictlyIndispensableForActivity) result.reasons.push('No marcado como estrictamente indispensable.');
  if (!expense.isActuallyPaid)                     result.reasons.push('No está efectivamente pagado.');
  if (!expense.hasCFDI)                            result.reasons.push('Falta CFDI.');
  if (!expense.invoiceReceiverRFCMatchesTaxpayer)  result.reasons.push('Factura no está a nombre del contribuyente.');
  if (
    expense.amountMXN > FISCAL_CONSTANTS.BANKED_PAYMENT_THRESHOLD_MXN &&
    !isBankedPayment(expense.paymentMethod)
  )
    result.reasons.push('Pago mayor a $2,000 debe estar bancarizado.');

  if (result.reasons.length > 0) return result;

  result.deductibleForISR               = true;
  result.deductibleAmountMXN            = expense.amountMXN;
  result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : 1;
  result.capAppliedDescription          = 'Gasto ordinario de actividad: 100%.';
  result.officialSourceNotes.push('SAT servicios profesionales / LISR arts. 103 y 105.');
  return result;
}

function evaluateBusinessInvestmentDeduction({ expense }) {
  const result = createBaseResult();
  result.deductionKind = DEDUCTION_KINDS.BUSINESS_ANNUAL_INVESTMENT;

  if (!expense.assetType) { result.missingData.push('assetType'); return result; }
  if (!expense.isStrictlyIndispensableForActivity) result.reasons.push('Inversión no marcada como indispensable.');
  if (!expense.hasCFDI) result.reasons.push('Falta CFDI.');

  const rate = FISCAL_CONSTANTS.INVESTMENT_DEDUCTION_RATES_BUSINESS[expense.assetType];
  if (typeof rate !== 'number') result.reasons.push('Tipo de activo no modelado en este MVP.');

  if (result.reasons.length > 0) return result;

  const deductible = expense.amountMXN * rate;
  result.deductibleForISR               = true;
  result.deductibleAmountMXN            = deductible;
  result.deductiblePercentageOverExpense= rate;
  result.capAppliedDescription          = `Inversión: ${(rate * 100).toFixed(0)}% anual.`;
  result.officialSourceNotes.push('LISR arts. 103, 104, 105 y 34.');
  return result;
}

function evaluateRentalDeduction({ annualContext, expense }) {
  const result = createBaseResult();

  if (annualContext.usesBlindRentalDeduction) {
    result.deductionKind = DEDUCTION_KINDS.ARR_OPTIONAL_35;
    if (expense.category === EXPENSE_CATEGORIES.ARR_PROPERTY_TAX) {
      if (!expense.hasCFDI) { result.reasons.push('Falta comprobante del predial.'); return result; }
      result.deductibleForISR               = true;
      result.deductibleAmountMXN            = expense.amountMXN;
      result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : 1;
      result.capAppliedDescription          = 'Con deducción opcional: predial adicional permitido.';
      result.officialSourceNotes.push('LISR art. 115.');
      return result;
    }
    result.reasons.push('Con deducción opcional (35%), este gasto queda sustituido.');
    result.officialSourceNotes.push('LISR art. 115.');
    return result;
  }

  if (!expense.hasCFDI)        result.reasons.push('Falta CFDI.');
  if (!expense.isActuallyPaid) result.reasons.push('No efectivamente pagado.');
  if (result.reasons.length > 0) return result;

  const ordinaryCategories = [
    EXPENSE_CATEGORIES.ARR_PROPERTY_TAX,
    EXPENSE_CATEGORIES.ARR_MAINTENANCE_OR_WATER,
    EXPENSE_CATEGORIES.ARR_REAL_INTEREST,
    EXPENSE_CATEGORIES.ARR_SALARIES_FEES_TAXES,
    EXPENSE_CATEGORIES.ARR_INSURANCE,
  ];

  if (ordinaryCategories.includes(expense.category)) {
    result.deductionKind                  = DEDUCTION_KINDS.ARR_CURRENT_PERIOD;
    result.deductibleForISR               = true;
    result.deductibleAmountMXN            = expense.amountMXN;
    result.deductiblePercentageOverExpense= expense.amountMXN === 0 ? 0 : 1;
    result.capAppliedDescription          = 'Deducción autorizada arrendamiento: 100%.';
    result.officialSourceNotes.push('LISR art. 115.');
    return result;
  }

  if (expense.category === EXPENSE_CATEGORIES.ARR_CONSTRUCTION_INVESTMENT) {
    result.deductionKind                  = DEDUCTION_KINDS.ARR_ANNUAL_INVESTMENT;
    const rate                            = FISCAL_CONSTANTS.INVESTMENT_DEDUCTION_RATES_RENTAL.CONSTRUCTION;
    result.deductibleForISR               = true;
    result.deductibleAmountMXN            = expense.amountMXN * rate;
    result.deductiblePercentageOverExpense= rate;
    result.capAppliedDescription          = `Construcción arrendamiento: ${(rate * 100).toFixed(0)}% anual.`;
    result.officialSourceNotes.push('LISR arts. 115 y 149.');
    return result;
  }

  result.reasons.push('Categoría de arrendamiento no modelada en este MVP.');
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * evaluateExpenseDeductibility
 *
 * Evalúa si un gasto específico es deducible para ISR dado el perfil fiscal del usuario.
 *
 * @param {object} input
 * @param {string[]} input.currentObligations  — obligaciones fiscales activas
 * @param {object}   input.annualContext        — contexto anual (ingresos, UMA, cap consumido)
 * @param {object}   input.expense              — datos del gasto a evaluar
 * @returns {object} resultado con deductibleAmountMXN, deductionKind, reasons, etc.
 */
function evaluateExpenseDeductibility(input) {
  const { currentObligations = [], annualContext = {}, expense = {} } = input;

  const ctx = {
    annualTotalIncomeMXN:                        annualContext.annualTotalIncomeMXN || 0,
    currentYearAccumIncomeForRetirementCapMXN:   annualContext.currentYearAccumIncomeForRetirementCapMXN || 0,
    previousYearAccumIncomeForDonationCapMXN:    annualContext.previousYearAccumIncomeForDonationCapMXN || 0,
    annualUMAValueMXN:                           annualContext.annualUMAValueMXN || FISCAL_CONSTANTS.ANNUAL_UMA_VALUE_MXN,
    alreadyConsumedGlobalPersonalCapMXN:         annualContext.alreadyConsumedGlobalPersonalCapMXN || 0,
    usesBlindRentalDeduction:                    Boolean(annualContext.usesBlindRentalDeduction),
  };

  const base = createBaseResult();

  if (!Array.isArray(currentObligations) || currentObligations.length === 0) {
    base.missingData.push('currentObligations');
    return base;
  }
  if (!expense.category) {
    base.missingData.push('expense.category');
    return base;
  }

  // RESICO: sin deducción de actividad para ISR
  if (hasAnyRESICO(currentObligations)) {
    const r = createBaseResult();
    r.reasons.push('RESICO: para ISR de la actividad no aplican deducciones de gasto.');
    r.warnings.push('Caso mixto (nómina + RESICO) puede requerir revisión manual.');
    r.officialSourceNotes.push('LISR arts. 113-E y 113-F.');
    return r;
  }

  // Deducciones personales — salud
  const healthCategories = [
    EXPENSE_CATEGORIES.PERSONAL_MEDICAL,
    EXPENSE_CATEGORIES.PERSONAL_MEDICAL_DISABILITY,
    EXPENSE_CATEGORIES.PERSONAL_OPTICAL_LENSES,
    EXPENSE_CATEGORIES.PERSONAL_MEDICAL_INSURANCE,
  ];
  if (healthCategories.includes(expense.category)) {
    if (!canUsePersonalDeductions(currentObligations)) {
      base.reasons.push('Obligaciones actuales no habilitan deducciones personales.');
      return base;
    }
    return evaluatePersonalMedicalDeduction({ annualContext: ctx, expense });
  }

  // Deducciones personales — resto
  const personalRoutes = {
    [EXPENSE_CATEGORIES.PERSONAL_TUITION]:               evaluatePersonalTuitionDeduction,
    [EXPENSE_CATEGORIES.PERSONAL_SCHOOL_TRANSPORT]:      evaluateSchoolTransportDeduction,
    [EXPENSE_CATEGORIES.PERSONAL_FUNERAL]:               evaluateFuneralDeduction,
    [EXPENSE_CATEGORIES.PERSONAL_DONATION]:              evaluateDonationDeduction,
    [EXPENSE_CATEGORIES.PERSONAL_RETIREMENT_CONTRIBUTION]: evaluateRetirementContributionDeduction,
    [EXPENSE_CATEGORIES.PERSONAL_MORTGAGE_REAL_INTEREST]:  evaluateMortgageRealInterestDeduction,
  };
  if (personalRoutes[expense.category]) {
    if (!canUsePersonalDeductions(currentObligations)) {
      base.reasons.push('Obligaciones actuales no habilitan deducciones personales.');
      return base;
    }
    return personalRoutes[expense.category]({ annualContext: ctx, expense });
  }

  // Actividad empresarial / servicios profesionales
  const isBusinessObligation =
    currentObligations.includes(OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL) ||
    currentObligations.includes(OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL);

  if (isBusinessObligation) {
    const ordinaryBusinessCategories = [
      EXPENSE_CATEGORIES.BUSINESS_INVENTORY_OR_RAW_MATERIALS,
      EXPENSE_CATEGORIES.BUSINESS_GENERAL_NECESSARY_EXPENSE,
      EXPENSE_CATEGORIES.BUSINESS_OFFICE_RENT,
      EXPENSE_CATEGORIES.BUSINESS_UTILITIES,
      EXPENSE_CATEGORIES.BUSINESS_PHONE_INTERNET,
      EXPENSE_CATEGORIES.BUSINESS_INTEREST,
      EXPENSE_CATEGORIES.BUSINESS_IMSS,
      EXPENSE_CATEGORIES.BUSINESS_LOCAL_TAX,
    ];
    if (ordinaryBusinessCategories.includes(expense.category))
      return evaluateGeneralBusinessDeduction({ expense });
    if (expense.category === EXPENSE_CATEGORIES.BUSINESS_INVESTMENT)
      return evaluateBusinessInvestmentDeduction({ expense });
  }

  // Arrendamiento régimen general
  if (currentObligations.includes(OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL)) {
    const rentalCategories = [
      EXPENSE_CATEGORIES.ARR_PROPERTY_TAX,
      EXPENSE_CATEGORIES.ARR_MAINTENANCE_OR_WATER,
      EXPENSE_CATEGORIES.ARR_REAL_INTEREST,
      EXPENSE_CATEGORIES.ARR_SALARIES_FEES_TAXES,
      EXPENSE_CATEGORIES.ARR_INSURANCE,
      EXPENSE_CATEGORIES.ARR_CONSTRUCTION_INVESTMENT,
    ];
    if (rentalCategories.includes(expense.category))
      return evaluateRentalDeduction({ annualContext: ctx, expense });
  }

  base.reasons.push('Combinación obligación + categoría no modelada en este MVP.');
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve un catálogo de las deducciones disponibles para un usuario dado su perfil fiscal.
 * Útil para mostrar al usuario qué puede deducir antes de registrar gastos.
 *
 * @param {object} input
 * @param {string[]} input.currentObligations
 * @param {boolean}  input.usesBlindRentalDeduction
 * @returns {object[]}
 */
function buildDeductionCatalog({ currentObligations, usesBlindRentalDeduction = false }) {
  const catalog = [];

  if (canUsePersonalDeductions(currentObligations)) {
    catalog.push({ family: 'PERSONAL_DEDUCTIONS',      item: 'Gastos médicos y hospitalarios', rule: '100% sujeto a tope global (5 UMA o 15% del ingreso).' });
    catalog.push({ family: 'PERSONAL_DEDUCTIONS',      item: 'Colegiaturas',                   rule: 'Tope por nivel educativo. Fuente: SAT colegiaturas.' });
    catalog.push({ family: 'PERSONAL_DEDUCTIONS',      item: 'Donativos a donatarias',         rule: '7% del ingreso anterior (4% si es gobierno).' });
    catalog.push({ family: 'PERSONAL_DEDUCTIONS',      item: 'Aportaciones AFORE voluntarias', rule: 'Menor entre 10% del ingreso o 5 UMA.' });
    catalog.push({ family: 'PERSONAL_DEDUCTIONS',      item: 'Intereses hipotecarios reales',  rule: 'Crédito ≤ 750,000 UDIS. Solo interés real.' });
    catalog.push({ family: 'PERSONAL_DEDUCTIONS',      item: 'Gastos funerarios',              rule: 'Máx 1 UMA anual.' });
  }

  if (
    currentObligations.includes(OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL) ||
    currentObligations.includes(OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL)
  ) {
    catalog.push({ family: 'BUSINESS_DEDUCTIONS_ISR',  item: 'Gastos necesarios para la actividad', rule: '100% si son estrictamente indispensables y cuentan con CFDI.' });
    catalog.push({ family: 'BUSINESS_DEDUCTIONS_ISR',  item: 'Inversiones (equipo, muebles)',       rule: 'Tasa anual por tipo de activo (LISR arts. 34, 103-105).' });
    catalog.push({ family: 'BUSINESS_DEDUCTIONS_ISR',  item: 'Cuotas IMSS patronales',             rule: '100% deducible.' });
  }

  if (currentObligations.includes(OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL)) {
    if (usesBlindRentalDeduction) {
      catalog.push({ family: 'ARR_DEDUCTIONS_ISR',    item: 'Deducción opcional ciega 35%',        rule: '35% de ingresos + predial adicional (LISR art. 115).' });
    } else {
      catalog.push({ family: 'ARR_DEDUCTIONS_ISR',    item: 'Gastos autorizados arrendamiento',    rule: '100% de gastos elegibles: predial, mantenimiento, seguros, intereses.' });
      catalog.push({ family: 'ARR_DEDUCTIONS_ISR',    item: 'Inversión en construcción',           rule: '5% anual sobre el costo.' });
    }
  }

  if (hasAnyRESICO(currentObligations)) {
    catalog.push({ family: 'RESICO_ISR',              item: 'Sin deducción de gastos para ISR',    rule: 'RESICO: tasa directa sobre ingresos cobrados. No aplican deducciones de actividad (LISR art. 113-E).' });
  }

  return catalog;
}

module.exports = {
  evaluateExpenseDeductibility,
  buildDeductionCatalog,
  // helpers exportados para testing
  hasAnyRESICO,
  canUsePersonalDeductions,
  calculateGlobalPersonalDeductionsCap,
};
