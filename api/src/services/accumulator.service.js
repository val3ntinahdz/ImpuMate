'use strict';

/**
 * Recalculates the deductions accumulator snapshot from scratch for a session.
 * Called after every expense add, update, or delete — because the global
 * personal deduction cap is sequential (each approved expense consumes from it).
 */

const { expenses, expenseEvaluations, accumulatorSnapshots, incomeSources, users } = require('./inMemoryStore');
const { createDeductionsAccumulator } = require('../../../integrated-algorithms/src/core/deductionsAccumulator');
const { FISCAL_CONSTANTS } = require('../../../integrated-algorithms/src/constants/fiscalConstants');
const {
  DEDUCTION_KINDS,
  CATEGORIES_WITHOUT_IVA_ACREDITABLE,
} = require('../../../integrated-algorithms/src/constants/taxCatalogs');

function calculateGlobalPersonalCap(annualTotalIncomeMXN) {
  const capByUMA =
    FISCAL_CONSTANTS.PERSONAL_DEDUCTIONS_GLOBAL_CAP.umaMultiplier * FISCAL_CONSTANTS.ANNUAL_UMA_VALUE_MXN;
  const capByIncome =
    FISCAL_CONSTANTS.PERSONAL_DEDUCTIONS_GLOBAL_CAP.incomePercentage * annualTotalIncomeMXN;
  return Math.min(capByUMA, capByIncome);
}

function isEligibleForIVAAcreditable(expense, deductionKind) {
  const activityKinds = new Set([
    DEDUCTION_KINDS.BUSINESS_CURRENT_PERIOD,
    DEDUCTION_KINDS.BUSINESS_ANNUAL_INVESTMENT,
    DEDUCTION_KINDS.ARR_CURRENT_PERIOD,
    DEDUCTION_KINDS.ARR_ANNUAL_INVESTMENT,
  ]);

  if (!activityKinds.has(deductionKind)) return false;
  if (CATEGORIES_WITHOUT_IVA_ACREDITABLE.has(expense.category)) return false;
  if (!expense.hasCFDI) return false;

  return true;
}

async function recalculate(sessionId, session, currentObligations) {
  const [user, allExpenses, sources] = await Promise.all([
    users.findById(session.userId),
    expenses.findBySession(sessionId),
    incomeSources.findBySession(sessionId),
  ]);

  // Derive annual total income from the session's registered income sources
  const annualTotalIncome = sources.reduce((sum, s) => sum + (s.montoAnualEstimado ?? 0), 0);

  const annualContext = {
    annualTotalIncomeMXN:                        annualTotalIncome,
    currentYearAccumIncomeForRetirementCapMXN:    annualTotalIncome,
    previousYearAccumIncomeForDonationCapMXN:     session.previousYearIncomeMxn ?? 0,
    annualUMAValueMXN:                            FISCAL_CONSTANTS.ANNUAL_UMA_VALUE_MXN,
    alreadyConsumedGlobalPersonalCapMXN:          0, // accumulator resets this each run
    usesBlindRentalDeduction:                     user?.usesBlindRentalDeduction ?? false,
  };

  const acc = createDeductionsAccumulator(annualContext);
  const globalPersonalCapAtEvalMXN = calculateGlobalPersonalCap(annualTotalIncome);
  let consumedGlobalCapBeforeEvalMXN = 0;

  for (const expense of allExpenses) {
    const evaluation = acc.evaluate(expense, currentObligations);
    const generatesIVAAcreditable = isEligibleForIVAAcreditable(expense, evaluation.deductionKind);
    const estimatedIVAAcreditableMXN = generatesIVAAcreditable
      ? evaluation.deductibleAmountMXN * FISCAL_CONSTANTS.GENERAL_IVA_RATE
      : 0;

    await expenseEvaluations.saveForExpense(expense.id, sessionId, {
      deductibleForISR:                evaluation.deductibleForISR,
      deductionKind:                   evaluation.deductionKind,
      deductibleAmountMXN:             evaluation.deductibleAmountMXN,
      deductiblePercentageOverExpense: evaluation.deductiblePercentageOverExpense,
      capAppliedDescription:           evaluation.capAppliedDescription,
      globalPersonalCapAtEvalMXN,
      consumedGlobalCapBeforeEvalMXN,
      generatesIVAAcreditable,
      estimatedIVAAcreditableMXN,
    });

    if (
      evaluation.deductibleForISR &&
      evaluation.deductionKind === DEDUCTION_KINDS.PERSONAL_ANNUAL
    ) {
      consumedGlobalCapBeforeEvalMXN += evaluation.deductibleAmountMXN;
    }
  }

  const summary = acc.getSummary();

  const snapshot = {
    totalPersonalDeductiblesMxn:  summary.totalPersonalDeductiblesMXN,
    totalActivityDeductiblesMxn:  summary.totalActivityDeductiblesMXN,
    totalIvaAcreditableMxn:       summary.totalIVAAcreditableMXN,
    totalDeductiblesMxn:          summary.totalDeductiblesMXN,
    approvedCount:                summary.approvedCount,
    rejectedCount:                summary.rejectedCount,
    approvedExpenses:             summary.approvedExpenses,
    rejectedExpenses:             summary.rejectedExpenses,
  };

  await accumulatorSnapshots.save(sessionId, snapshot);
  return snapshot;
}

module.exports = { recalculate };
