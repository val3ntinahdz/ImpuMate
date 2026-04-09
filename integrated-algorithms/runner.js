'use strict';

/**
 * ============================================================
 * runner.js — Runner Unificado ImpuMate
 * ============================================================
 *
 * Consolida los casos de prueba de ambos archivos originales:
 *
 *   main_expenseDeductionAdvisor.js  →  SECCIÓN A: catálogo de deducciones
 *                                       SECCIÓN B: 7 casos unitarios del motor de deducibles
 *
 *   main.js                          →  SECCIÓN C: 4 perfiles end-to-end
 *                                       (deducibles → acumulador → buffer)
 *
 * Cómo ejecutar:
 *   node runner.js              ← corre las 4 secciones completas
 *   node runner.js --seccion=A  ← solo catálogos de deducciones
 *   node runner.js --seccion=B  ← solo casos unitarios de deducibles
 *   node runner.js --seccion=C  ← solo casos end-to-end con buffer
 *   node runner.js --seccion=D  ← solo identificador de régimen fiscal
 */

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTACIONES
// ─────────────────────────────────────────────────────────────────────────────

const {
  evaluateExpenseDeductibility,
  buildDeductionCatalog,
} = require('./src/modules/expenseDeductionAdvisor');

const { createDeductionsAccumulator } = require('./src/core/deductionsAccumulator');
const { calculateTaxBuffer }               = require('./src/modules/taxBufferCalculator');
const { identifyTaxRegimesAndObligations } = require('./src/modules/taxRegimeIdentifier');
const { FISCAL_CONSTANTS }            = require('./src/constants/fiscalConstants');
const {
  OBLIGATIONS,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} = require('./src/constants/taxCatalogs');

// Alias para compatibilidad con los test cases del main.js original del régimen
const OBLIGATION_CATEGORY = OBLIGATIONS;

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL DE SECCIONES POR ARGUMENTO CLI
// ─────────────────────────────────────────────────────────────────────────────

const args        = process.argv.slice(2);
const seccionArg  = args.find((a) => a.startsWith('--seccion='));
const soloSeccion = seccionArg ? seccionArg.split('=')[1].toUpperCase() : null;

function shouldRun(seccion) {
  return !soloSeccion || soloSeccion === seccion;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE PRESENTACIÓN
// ─────────────────────────────────────────────────────────────────────────────

function asMXN(amount) {
  return `$${Number(amount).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MXN`;
}

function printSection(title) {
  const line = '='.repeat(80);
  console.log(`\n${line}\n${title}\n${line}`);
}

function printCaseHeader(title) {
  const line = '═'.repeat(70);
  console.log(`\n${line}\n  ${title}\n${line}`);
}

function printExecutiveSummary(result) {
  const totalISR = Object.values(result.estimatedISRByObligation).reduce((s, v) => s + v, 0);
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│                    RESULTADO DEL BUFFER                      │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│  ★ Apartar mensualmente:    ${asMXN(result.recommendedMonthlyBuffer).padEnd(30)} │`);
  console.log(`│  ISR total estimado:        ${asMXN(totalISR).padEnd(30)} │`);
  console.log(`│  IVA causado:               ${asMXN(result.estimatedIVACausado).padEnd(30)} │`);
  console.log(`│  IVA acreditable:           ${asMXN(result.estimatedIVAAcreditable).padEnd(30)} │`);
  console.log(`│  IVA pendiente estimado:    ${asMXN(result.estimatedIVAOwed).padEnd(30)} │`);
  console.log(`│  Pasivo fiscal bruto:       ${asMXN(result.totalTaxLiability).padEnd(30)} │`);
  console.log(`│  Pasivo con margen segur.:  ${asMXN(result.totalWithSafetyMargin).padEnd(30)} │`);
  console.log(`│  Horizonte del buffer:      ${String(result.bufferHorizonMonths + ' mes(es)').padEnd(30)} │`);
  console.log('└─────────────────────────────────────────────────────────────┘');
}

function printDetailedTrace(result) {
  console.log('\n── BASE GRAVABLE POR OBLIGACIÓN ──────────────────────────────');
  for (const [obligation, base] of Object.entries(result.taxableBaseByObligation))
    console.log(`   ${obligation}: ${asMXN(base)}`);

  console.log('\n── ISR ESTIMADO POR OBLIGACIÓN ───────────────────────────────');
  for (const [obligation, isr] of Object.entries(result.estimatedISRByObligation))
    console.log(`   ${obligation}: ${asMXN(isr)}`);

  console.log('\n── RAZONAMIENTO PASO A PASO ──────────────────────────────────');
  result.reasoning.forEach((step, i) => console.log(`   ${i + 1}. ${step}`));

  if (result.warnings.length > 0) {
    console.log('\n── ⚠ ADVERTENCIAS ────────────────────────────────────────────');
    result.warnings.forEach((w) => console.log(`   ⚠  ${w}`));
  }

  if (result.missingData.length > 0) {
    console.log('\n── ℹ DATOS FALTANTES PARA MAYOR PRECISIÓN ────────────────────');
    result.missingData.forEach((m) => console.log(`   ℹ  ${m}`));
  }

  console.log('\n── AVISO LEGAL ────────────────────────────────────────────────');
  console.log(`   ${result.disclaimer}`);
}

function printTestCase(title, payload) {
  printSection(title);
  console.log('INPUT:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nOUTPUT:');
  console.log(JSON.stringify(evaluateExpenseDeductibility(payload), null, 2));
}

function printAccumulatorSummary(summary) {
  console.log(`\n[ACUMULADOR] ${summary.approvedCount} gasto(s) aprobado(s), ${summary.rejectedCount} rechazado(s)`);
  console.log(`   Deducciones personales aprobadas:  ${asMXN(summary.totalPersonalDeductiblesMXN)}`);
  console.log(`   Deducciones de actividad aprobadas: ${asMXN(summary.totalActivityDeductiblesMXN)}`);
  console.log(`   IVA acreditable estimado:           ${asMXN(summary.totalIVAAcreditableMXN)}`);
  if (summary.rejectedExpenses.length > 0) {
    console.log('   Rechazados:');
    summary.rejectedExpenses.forEach((r) =>
      console.log(`     ✗ ${r.expense.category}: ${r.reasons.join('; ')}`),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE: contexto anual base reutilizable en Sección B
// ─────────────────────────────────────────────────────────────────────────────

const annualContextBase = {
  annualTotalIncomeMXN:                      500_000,
  currentYearAccumIncomeForRetirementCapMXN: 500_000,
  previousYearAccumIncomeForDonationCapMXN:  450_000,
  annualUMAValueMXN:                         FISCAL_CONSTANTS.ANNUAL_UMA_VALUE_MXN,
  alreadyConsumedGlobalPersonalCapMXN:       0,
  usesBlindRentalDeduction:                  false,
};

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN A — CATÁLOGO DE DEDUCCIONES POR PERFIL FISCAL
// (de main_expenseDeductionAdvisor.js)
// ═════════════════════════════════════════════════════════════════════════════

function runSeccionA() {
  printSection('SECCIÓN A — CATÁLOGO DE DEDUCCIONES DISPONIBLES POR PERFIL FISCAL');

  const perfiles = [
    {
      label:            'Usuario 1: sueldos + servicios profesionales régimen general',
      currentObligations: [OBLIGATIONS.SUELDOS_Y_SALARIOS, OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL],
      usesBlindRentalDeduction: false,
    },
    {
      label:            'Usuario 2: arrendamiento régimen general (deducción real)',
      currentObligations: [OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL],
      usesBlindRentalDeduction: false,
    },
    {
      label:            'Usuario 3: arrendamiento régimen general (deducción ciega 35%)',
      currentObligations: [OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL],
      usesBlindRentalDeduction: true,
    },
    {
      label:            'Usuario 4: RESICO personas físicas',
      currentObligations: [OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_RESICO],
      usesBlindRentalDeduction: false,
    },
  ];

  for (const perfil of perfiles) {
    console.log(`\n[${perfil.label}]`);
    console.log(JSON.stringify(buildDeductionCatalog(perfil), null, 2));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN B — CASOS UNITARIOS DEL MOTOR DE DEDUCIBLES
// (de main_expenseDeductionAdvisor.js)
// ═════════════════════════════════════════════════════════════════════════════

function runSeccionB() {
  printSection('SECCIÓN B — CASOS UNITARIOS DEL MOTOR DE DEDUCIBILIDAD');

  // ── B1: Gasto médico personal deducible ───────────────────────────────────
  printTestCase('B1 — GASTO MÉDICO PERSONAL DEDUCIBLE', {
    currentObligations: [OBLIGATIONS.SUELDOS_Y_SALARIOS],
    annualContext: annualContextBase,
    expense: {
      category:                              EXPENSE_CATEGORIES.PERSONAL_MEDICAL,
      amountMXN:                             12_000,
      paymentMethod:                         PAYMENT_METHODS.CREDIT_CARD,
      hasCFDI:                               true,
      invoiceReceiverRFCMatchesTaxpayer:     true,
      paidFromTaxpayerAccount:               true,
      paidInRelevantFiscalYear:              true,
      beneficiaryRelationship:               'SELF',
      providerHasRequiredProfessionalLicense:true,
    },
  });

  // ── B2: Gastos funerarios pagados en efectivo ─────────────────────────────
  printTestCase('B2 — GASTO FUNERARIO PAGADO EN EFECTIVO (NO DEDUCIBLE)', {
    currentObligations: [OBLIGATIONS.SUELDOS_Y_SALARIOS],
    annualContext: annualContextBase,
    expense: {
      category:                          EXPENSE_CATEGORIES.PERSONAL_FUNERAL,
      amountMXN:                         25_000,
      paymentMethod:                     PAYMENT_METHODS.CASH,
      hasCFDI:                           true,
      invoiceReceiverRFCMatchesTaxpayer: true,
      paidFromTaxpayerAccount:           false,
      paidInRelevantFiscalYear:          true,
      beneficiaryRelationship:           'PARENT',
    },
  });

  // ── B3: Inversión en equipo de cómputo (servicios profesionales) ──────────
  printTestCase('B3 — INVERSIÓN EN EQUIPO DE CÓMPUTO PARA SERVICIOS PROFESIONALES', {
    currentObligations: [OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL],
    annualContext: annualContextBase,
    expense: {
      category:                           EXPENSE_CATEGORIES.BUSINESS_INVESTMENT,
      amountMXN:                          50_000,
      paymentMethod:                      PAYMENT_METHODS.TRANSFER,
      hasCFDI:                            true,
      invoiceReceiverRFCMatchesTaxpayer:  true,
      isStrictlyIndispensableForActivity: true,
      assetType:                          'COMPUTER_EQUIPMENT', // 30% anual → $15,000
    },
  });

  // ── B4: Arrendamiento deducción ciega + mantenimiento ─────────────────────
  printTestCase('B4 — ARRENDAMIENTO CON DEDUCCIÓN CIEGA + MANTENIMIENTO (NO INDIVIDUALMENTE DEDUCIBLE)', {
    currentObligations: [OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL],
    annualContext: { ...annualContextBase, usesBlindRentalDeduction: true },
    expense: {
      category:      EXPENSE_CATEGORIES.ARR_MAINTENANCE_OR_WATER,
      amountMXN:     5_000,
      paymentMethod: PAYMENT_METHODS.TRANSFER,
      hasCFDI:       true,
      isActuallyPaid:true,
    },
  });

  // ── B5: Arrendamiento deducción ciega + predial ───────────────────────────
  printTestCase('B5 — ARRENDAMIENTO CON DEDUCCIÓN CIEGA + PREDIAL (SÍ DEDUCIBLE)', {
    currentObligations: [OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL],
    annualContext: { ...annualContextBase, usesBlindRentalDeduction: true },
    expense: {
      category:      EXPENSE_CATEGORIES.ARR_PROPERTY_TAX,
      amountMXN:     8_000,
      paymentMethod: PAYMENT_METHODS.TRANSFER,
      hasCFDI:       true,
      isActuallyPaid:true,
    },
  });

  // ── B6: RESICO + renta de oficina ─────────────────────────────────────────
  printTestCase('B6 — RESICO + RENTA DE OFICINA (NO DEDUCIBLE PARA ISR)', {
    currentObligations: [OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_RESICO],
    annualContext: annualContextBase,
    expense: {
      category:                           EXPENSE_CATEGORIES.BUSINESS_OFFICE_RENT,
      amountMXN:                          10_000,
      paymentMethod:                      PAYMENT_METHODS.TRANSFER,
      hasCFDI:                            true,
      invoiceReceiverRFCMatchesTaxpayer:  true,
      isActuallyPaid:                     true,
      isStrictlyIndispensableForActivity: true,
    },
  });

  // ── B7: Donativo a donataria autorizada ───────────────────────────────────
  // Ingreso anterior $450,000 → tope 7% = $31,500 → el monto $50,000 se limita
  printTestCase('B7 — DONATIVO CON TOPE ESPECÍFICO DEL 7% (INGRESO ANTERIOR $450K → MÁXIMO $31,500)', {
    currentObligations: [OBLIGATIONS.SUELDOS_Y_SALARIOS],
    annualContext: annualContextBase,
    expense: {
      category:                          EXPENSE_CATEGORIES.PERSONAL_DONATION,
      amountMXN:                         50_000,
      paymentMethod:                     PAYMENT_METHODS.TRANSFER,
      hasCFDI:                           true,
      invoiceReceiverRFCMatchesTaxpayer: true,
      paidFromTaxpayerAccount:           true,
      paidInRelevantFiscalYear:          true,
      donationRecipientType:             'AUTHORIZED_DONATARIA',
      donationIsOnerousOrRemunerative:   false,
    },
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN C — CASOS END-TO-END: DEDUCIBLES → ACUMULADOR → BUFFER
// (de main.js)
// ═════════════════════════════════════════════════════════════════════════════

// ── C1: Persona con solo sueldos y salarios ───────────────────────────────────
/**
 * PERFIL: "Ana González"
 * Empleada de tiempo completo en una empresa de retail en CDMX.
 * Ingresos: Sueldo bruto anual ~$270,000 MXN.
 * Deducciones: Gastos médicos (psicólogo) y seguro de gastos médicos.
 * ISR retenido: $24,000 MXN en el año por su empleador.
 * IVA: No causa IVA (asalariada).
 */
function runC1() {
  printCaseHeader('C1 — Persona con SOLO sueldos y salarios (Ana González)');

  const ANNUAL_INCOME = 270_000;
  const obligations   = [OBLIGATIONS.SUELDOS_Y_SALARIOS];
  const acc           = createDeductionsAccumulator({ annualTotalIncomeMXN: ANNUAL_INCOME });

  console.log('\n[INPUT] Gastos ingresados al Deductibles Calculator:');

  // Gasto médico (psicología)
  acc.evaluate({
    category:                              EXPENSE_CATEGORIES.PERSONAL_MEDICAL,
    amountMXN:                             15_600,   // 13 sesiones × $1,200
    hasCFDI:                               true,
    invoiceReceiverRFCMatchesTaxpayer:     true,
    paymentMethod:                         PAYMENT_METHODS.DEBIT_CARD,
    paidFromTaxpayerAccount:               true,
    paidInRelevantFiscalYear:              true,
    beneficiaryRelationship:               'SELF',
    providerHasRequiredProfessionalLicense:true,
  }, obligations);

  // Seguro de gastos médicos mayores
  acc.evaluate({
    category:                              EXPENSE_CATEGORIES.PERSONAL_MEDICAL_INSURANCE,
    amountMXN:                             9_200,    // prima anual GMM
    hasCFDI:                               true,
    invoiceReceiverRFCMatchesTaxpayer:     true,
    paymentMethod:                         PAYMENT_METHODS.CREDIT_CARD,
    paidFromTaxpayerAccount:               true,
    paidInRelevantFiscalYear:              true,
    beneficiaryRelationship:               'SELF',
    providerHasRequiredProfessionalLicense:true,
  }, obligations);

  const summary = acc.getSummary();
  printAccumulatorSummary(summary);

  console.log('\n[INPUT] Enviado al Tax Buffer Calculator:');
  console.log('   Ingresos brutos anuales:  $270,000 (sueldos)');
  console.log(`   Deducciones personales:   ${asMXN(summary.totalPersonalDeductiblesMXN)}`);
  console.log(`   Deducciones actividad:    ${asMXN(summary.totalActivityDeductiblesMXN)}`);
  console.log(`   IVA acreditable estimado: ${asMXN(summary.totalIVAAcreditableMXN)}`);
  console.log('   ISR ya retenido:          $24,000');
  console.log('   Horizonte:                3 meses');

  const result = calculateTaxBuffer({
    currentObligations: obligations,
    incomeSources: [
      {
        obligationType:       OBLIGATIONS.SUELDOS_Y_SALARIOS,
        grossAnnualAmountMXN: ANNUAL_INCOME,
        isSubjectToIVA:       false,
      },
    ],
    annualContext: {
      totalApprovedPersonalDeductiblesMXN: summary.totalPersonalDeductiblesMXN,
      totalApprovedActivityDeductiblesMXN: summary.totalActivityDeductiblesMXN,
      totalEstimatedIVAAcreditableMXN:     summary.totalIVAAcreditableMXN,
      isrAlreadyWithheldBySalaryMXN:       24_000,
      ivaAlreadyPaidToSATMXN:              0,
    },
    bufferHorizonMonths: 3,
  });

  printExecutiveSummary(result);
  printDetailedTrace(result);
}

// ── C2: Sueldos + actividad empresarial ──────────────────────────────────────
/**
 * PERFIL: "Carlos Méndez"
 * Trabaja como ingeniero de software en empresa + vende cursos online.
 * Ingresos: Sueldo bruto $360,000 + cursos $120,000 = $480,000 total.
 * Deducciones: colegiatura (hijo, primaria) + médicos + coworking + laptop.
 * ISR retenido por empleador: $48,000 MXN.
 * IVA: Solo la actividad empresarial (cursos) causa IVA.
 */
function runC2() {
  printCaseHeader('C2 — Sueldos + actividad empresarial (Carlos Méndez)');

  const ANNUAL_INCOME = 480_000; // $360k sueldo + $120k cursos
  const obligations   = [OBLIGATIONS.SUELDOS_Y_SALARIOS, OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL];
  const acc           = createDeductionsAccumulator({ annualTotalIncomeMXN: ANNUAL_INCOME });

  console.log('\n[INPUT] Gastos ingresados al Deductibles Calculator:');

  // Colegiatura hijo (primaria) — tope del nivel $12,900 se aplica sobre $15,000
  acc.evaluate({
    category:                          EXPENSE_CATEGORIES.PERSONAL_TUITION,
    amountMXN:                         15_000,
    hasCFDI:                           true,
    invoiceReceiverRFCMatchesTaxpayer: true,
    paymentMethod:                     PAYMENT_METHODS.TRANSFER,
    paidFromTaxpayerAccount:           true,
    paidInRelevantFiscalYear:          true,
    beneficiaryRelationship:           'CHILD',
    hasOfficialSchoolRecognition:      true,
    schoolLevel:                       'PRIMARIA',
  }, obligations);

  // Gastos médicos (dentista)
  acc.evaluate({
    category:                              EXPENSE_CATEGORIES.PERSONAL_MEDICAL,
    amountMXN:                             8_500,
    hasCFDI:                               true,
    invoiceReceiverRFCMatchesTaxpayer:     true,
    paymentMethod:                         PAYMENT_METHODS.DEBIT_CARD,
    paidFromTaxpayerAccount:               true,
    paidInRelevantFiscalYear:              true,
    beneficiaryRelationship:               'SELF',
    providerHasRequiredProfessionalLicense:true,
  }, obligations);

  // Renta coworking para producción de cursos ($3,000/mes × 12)
  acc.evaluate({
    category:                           EXPENSE_CATEGORIES.BUSINESS_OFFICE_RENT,
    amountMXN:                          36_000,
    hasCFDI:                            true,
    invoiceReceiverRFCMatchesTaxpayer:  true,
    paymentMethod:                      PAYMENT_METHODS.TRANSFER,
    isStrictlyIndispensableForActivity: true,
    isActuallyPaid:                     true,
  }, obligations);

  // Laptop (inversión equipo de cómputo, tasa 30% anual = $8,400)
  acc.evaluate({
    category:                           EXPENSE_CATEGORIES.BUSINESS_INVESTMENT,
    amountMXN:                          28_000,
    hasCFDI:                            true,
    invoiceReceiverRFCMatchesTaxpayer:  true,
    isStrictlyIndispensableForActivity: true,
    assetType:                          'COMPUTER_EQUIPMENT',
  }, obligations);

  const summary = acc.getSummary();
  printAccumulatorSummary(summary);
  console.log('   (colegiatura cap $12,900 por PRIMARIA + renta $36,000 100% + laptop 30% = $8,400)');

  console.log('\n[INPUT] Enviado al Tax Buffer Calculator:');
  console.log('   Sueldos:     $360,000 | Cursos: $120,000');
  console.log(`   Deducciones personales:   ${asMXN(summary.totalPersonalDeductiblesMXN)}`);
  console.log(`   Deducciones actividad:    ${asMXN(summary.totalActivityDeductiblesMXN)}`);
  console.log(`   IVA acreditable estimado: ${asMXN(summary.totalIVAAcreditableMXN)}`);
  console.log('   ISR ya retenido:          $48,000 | Horizonte: 1 mes');

  const result = calculateTaxBuffer({
    currentObligations: obligations,
    incomeSources: [
      {
        obligationType:       OBLIGATIONS.SUELDOS_Y_SALARIOS,
        grossAnnualAmountMXN: 360_000,
        isSubjectToIVA:       false,
      },
      {
        obligationType:       OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL,
        grossAnnualAmountMXN: 120_000,
        isSubjectToIVA:       true,
      },
    ],
    annualContext: {
      totalApprovedPersonalDeductiblesMXN: summary.totalPersonalDeductiblesMXN,
      totalApprovedActivityDeductiblesMXN: summary.totalActivityDeductiblesMXN,
      totalEstimatedIVAAcreditableMXN:     summary.totalIVAAcreditableMXN,
      isrAlreadyWithheldBySalaryMXN:       48_000,
      ivaAlreadyPaidToSATMXN:              0,
    },
    bufferHorizonMonths: 1,
  });

  printExecutiveSummary(result);
  printDetailedTrace(result);
}

// ── C3: Freelancer con ingreso variable ──────────────────────────────────────
/**
 * PERFIL: "Sofía Ramírez"
 * Diseñadora gráfica independiente en Oaxaca.
 * Ingresos completamente variables. Proyección anual: $180,000 MXN.
 * Sin ISR retenido. Servicios de diseño causan IVA.
 * Ya pagó $4,800 en pagos provisionales de IVA.
 */
function runC3() {
  printCaseHeader('C3 — Freelancer con ingreso variable (Sofía Ramírez)');

  const ANNUAL_INCOME = 180_000;
  const obligations   = [OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL];
  const acc           = createDeductionsAccumulator({ annualTotalIncomeMXN: ANNUAL_INCOME });

  console.log('\n[INPUT] Gastos ingresados al Deductibles Calculator:');

  // Internet y teléfono
  acc.evaluate({
    category:                           EXPENSE_CATEGORIES.BUSINESS_PHONE_INTERNET,
    amountMXN:                          7_200,   // $600/mes × 12
    hasCFDI:                            true,
    invoiceReceiverRFCMatchesTaxpayer:  true,
    paymentMethod:                      PAYMENT_METHODS.DEBIT_CARD,
    isStrictlyIndispensableForActivity: true,
    isActuallyPaid:                     true,
  }, obligations);

  // Tableta para diseño (inversión equipo de cómputo 30% anual = $3,600)
  acc.evaluate({
    category:                           EXPENSE_CATEGORIES.BUSINESS_INVESTMENT,
    amountMXN:                          12_000,
    hasCFDI:                            true,
    invoiceReceiverRFCMatchesTaxpayer:  true,
    isStrictlyIndispensableForActivity: true,
    assetType:                          'COMPUTER_EQUIPMENT',
  }, obligations);

  // Materiales y licencias de software
  acc.evaluate({
    category:                           EXPENSE_CATEGORIES.BUSINESS_GENERAL_NECESSARY_EXPENSE,
    amountMXN:                          8_400,   // $700/mes × 12
    hasCFDI:                            true,
    invoiceReceiverRFCMatchesTaxpayer:  true,
    paymentMethod:                      PAYMENT_METHODS.CREDIT_CARD,
    isStrictlyIndispensableForActivity: true,
    isActuallyPaid:                     true,
  }, obligations);

  const summary = acc.getSummary();
  printAccumulatorSummary(summary);
  console.log('   (internet $7,200 + tableta 30% $3,600 + materiales $8,400)');

  const ivaAntes   = ANNUAL_INCOME * FISCAL_CONSTANTS.GENERAL_IVA_RATE;
  console.log(`\n[IVA] Sin acreditable → IVA causado bruto: ${asMXN(ivaAntes)}`);
  console.log(`[IVA] IVA acreditable estimado (gastos actividad × 16%): ${asMXN(summary.totalIVAAcreditableMXN)}`);
  console.log(`[IVA] Reducción en buffer por modelar IVA acreditable: ${asMXN(summary.totalIVAAcreditableMXN)}`);

  console.log('\n[INPUT] Enviado al Tax Buffer Calculator:');
  console.log(`   Ingresos: ${asMXN(ANNUAL_INCOME)} | IVA ya pagado: $4,800 | Horizonte: 1 mes`);

  const result = calculateTaxBuffer({
    currentObligations: obligations,
    incomeSources: [
      {
        obligationType:       OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL,
        grossAnnualAmountMXN: ANNUAL_INCOME,
        isSubjectToIVA:       true,
      },
    ],
    annualContext: {
      totalApprovedPersonalDeductiblesMXN: summary.totalPersonalDeductiblesMXN,
      totalApprovedActivityDeductiblesMXN: summary.totalActivityDeductiblesMXN,
      totalEstimatedIVAAcreditableMXN:     summary.totalIVAAcreditableMXN,
      isrAlreadyWithheldBySalaryMXN:       0,
      ivaAlreadyPaidToSATMXN:              4_800,
    },
    bufferHorizonMonths: 1,
  });

  printExecutiveSummary(result);
  printDetailedTrace(result);
}

// ── C4: Deducciones que superan los límites legales ───────────────────────────
/**
 * PERFIL: "Roberto Vega"
 * Director de operaciones. Ingresos altos. Intenta deducir ~$150k.
 * Ingresos: Sueldo bruto anual $900,000 MXN.
 * ISR retenido por empleador: $180,000 MXN.
 * Tope global: min(5 UMA, 15% ingreso) = min($213,973, $135,000) = $135,000
 * → El sistema aprueba $147,500 antes del tope global, pero lo limita.
 * → Buffer = $0 → empleador retuvo de más → probable saldo a favor.
 */
function runC4() {
  printCaseHeader('C4 — Deducciones que superan los límites legales (Roberto Vega)');

  const ANNUAL_INCOME = 900_000;
  const obligations   = [OBLIGATIONS.SUELDOS_Y_SALARIOS];

  const topeUMA    = 5 * FISCAL_CONSTANTS.ANNUAL_UMA_VALUE_MXN;
  const topeIncome = 0.15 * ANNUAL_INCOME;

  console.log('\n[CONTEXTO] Tope global deducciones personales Roberto:');
  console.log(`   5 UMA anuales:       ${asMXN(topeUMA)}`);
  console.log(`   15% de $900,000:     ${asMXN(topeIncome)}`);
  console.log(`   → Tope aplicable:    ${asMXN(Math.min(topeUMA, topeIncome))}`);

  const acc = createDeductionsAccumulator({
    annualTotalIncomeMXN:                     ANNUAL_INCOME,
    currentYearAccumIncomeForRetirementCapMXN: ANNUAL_INCOME,
  });

  console.log('\n[INPUT] Gastos ingresados al Deductibles Calculator:');

  // Gastos médicos propios $35,000
  acc.evaluate({
    category:                              EXPENSE_CATEGORIES.PERSONAL_MEDICAL,
    amountMXN:                             35_000,
    hasCFDI:                               true,
    invoiceReceiverRFCMatchesTaxpayer:     true,
    paymentMethod:                         PAYMENT_METHODS.TRANSFER,
    paidFromTaxpayerAccount:               true,
    paidInRelevantFiscalYear:              true,
    beneficiaryRelationship:               'SELF',
    providerHasRequiredProfessionalLicense:true,
  }, obligations);

  // Seguro GMM $28,000
  acc.evaluate({
    category:                              EXPENSE_CATEGORIES.PERSONAL_MEDICAL_INSURANCE,
    amountMXN:                             28_000,
    hasCFDI:                               true,
    invoiceReceiverRFCMatchesTaxpayer:     true,
    paymentMethod:                         PAYMENT_METHODS.CREDIT_CARD,
    paidFromTaxpayerAccount:               true,
    paidInRelevantFiscalYear:              true,
    beneficiaryRelationship:               'SELF',
    providerHasRequiredProfessionalLicense:true,
  }, obligations);

  // Colegiatura bachillerato hija $27,000 — tope del nivel $24,500
  acc.evaluate({
    category:                          EXPENSE_CATEGORIES.PERSONAL_TUITION,
    amountMXN:                         27_000,
    hasCFDI:                           true,
    invoiceReceiverRFCMatchesTaxpayer: true,
    paymentMethod:                     PAYMENT_METHODS.TRANSFER,
    paidFromTaxpayerAccount:           true,
    paidInRelevantFiscalYear:          true,
    beneficiaryRelationship:           'CHILD',
    hasOfficialSchoolRecognition:      true,
    schoolLevel:                       'BACHILLERATO',
  }, obligations);

  // Aportaciones voluntarias AFORE $60,000
  // Tope: min(10% de $900k = $90k, 5 UMA = $213k) → $90k → acepta $60k completos
  acc.evaluate({
    category:                            EXPENSE_CATEGORIES.PERSONAL_RETIREMENT_CONTRIBUTION,
    amountMXN:                           60_000,
    hasCFDI:                             true,
    invoiceReceiverRFCMatchesTaxpayer:   true,
    paymentMethod:                       PAYMENT_METHODS.TRANSFER,
    paidFromTaxpayerAccount:             true,
    paidInRelevantFiscalYear:            true,
    meetsRetirementPermanenceRequirement:true,
  }, obligations);

  const summary        = acc.getSummary();
  const intentoDeducir = 35_000 + 28_000 + 27_000 + 60_000;

  console.log('\n[INPUT] Lo que Roberto quiso deducir vs. lo que el sistema aprobó:');
  console.log(`   Intentó deducir:          ${asMXN(intentoDeducir)}`);
  console.log(`   Aprobado por el sistema:  ${asMXN(summary.totalPersonalDeductiblesMXN)}`);
  console.log('   Motivo del recorte:       tope global + tope por nivel de bachillerato');
  printAccumulatorSummary(summary);

  const result = calculateTaxBuffer({
    currentObligations: obligations,
    incomeSources: [
      {
        obligationType:       OBLIGATIONS.SUELDOS_Y_SALARIOS,
        grossAnnualAmountMXN: ANNUAL_INCOME,
        isSubjectToIVA:       false,
      },
    ],
    annualContext: {
      totalApprovedPersonalDeductiblesMXN: summary.totalPersonalDeductiblesMXN,
      totalApprovedActivityDeductiblesMXN: summary.totalActivityDeductiblesMXN,
      totalEstimatedIVAAcreditableMXN:     summary.totalIVAAcreditableMXN,
      isrAlreadyWithheldBySalaryMXN:       180_000,
      ivaAlreadyPaidToSATMXN:              0,
    },
    bufferHorizonMonths: 1,
  });

  if (result.recommendedMonthlyBuffer <= 0) {
    console.log('\n[NOTA] Buffer = $0. El empleador probablemente ya retuvo suficiente.');
    console.log('       Roberto puede tener saldo a favor en su declaración anual de abril.');
    console.log('       Recomendación: verificar con su contador antes de gastar ese dinero.');
  }

  printExecutiveSummary(result);
  printDetailedTrace(result);
}

// ─────────────────────────────────────────────────────────────────────────────
// EJECUCIÓN
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║       ImpuMate — Runner Unificado — Ejercicio Fiscal 2026       ║');
console.log('║   Tax Buffer · Expense Deduction · Tax Regime Identifier        ║');
if (soloSeccion)
  console.log(`║       Corriendo solo: Sección ${soloSeccion.padEnd(37)}║`);
console.log('╚══════════════════════════════════════════════════════════════════╝');

if (shouldRun('A')) runSeccionA();
if (shouldRun('B')) runSeccionB();
if (shouldRun('C')) {
  printSection('SECCIÓN C — CASOS END-TO-END: DEDUCIBLES → ACUMULADOR → BUFFER');
  runC1();
  runC2();
  runC3();
  runC4();
}
if (shouldRun('D')) runSeccionD();

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║                  FIN DE LOS CASOS DE PRUEBA                     ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN D — IDENTIFICADOR DE RÉGIMEN FISCAL (5 casos del main.js original)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Helper de assertions (sin frameworks externos).
 * Lanza un error descriptivo si la condición falla.
 */
function assertTrue(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}
function assertEqual(actual, expected, message) {
  if (actual !== expected)
    throw new Error(`ASSERT FAILED: ${message}\n  expected: ${expected}\n  actual:   ${actual}`);
}
function assertArrayIncludes(arr, value, message) {
  assertTrue(Array.isArray(arr), `${message} (el valor evaluado no es arreglo)`);
  assertTrue(arr.includes(value), `${message}\n  missing: ${value}\n  array: ${JSON.stringify(arr)}`);
}

/**
 * Ejecuta un caso del identificador de régimen:
 * corre la identificación, imprime el resultado completo y valida expectativas.
 */
function runRegimeCase(caseName, { profile, incomeSources, expected }) {
  printCaseHeader(caseName);

  const identification = identifyTaxRegimesAndObligations(profile, incomeSources, {
    today: new Date('2026-02-10'),
  });

  console.log('\nResultado de identificacion:');
  console.log(JSON.stringify(identification, null, 2));

  // Validaciones estructurales generales
  assertTrue(identification && typeof identification === 'object',  'La salida debe ser un objeto.');
  assertTrue(Array.isArray(identification.obligationsDetected),     'obligationsDetected debe ser arreglo.');
  assertTrue(typeof identification.requiresSATUpdateNotice === 'boolean', 'requiresSATUpdateNotice debe ser boolean.');
  assertTrue(identification.executiveSummary && typeof identification.executiveSummary === 'object', 'executiveSummary debe existir.');

  // Validaciones específicas del caso
  if (expected) {
    if (expected.totalObligations !== undefined) {
      assertEqual(
        identification.obligationsDetected.length,
        expected.totalObligations,
        'Total de obligaciones detectadas no coincide.',
      );
    }

    if (expected.requiresSATUpdateNotice !== undefined) {
      assertEqual(
        identification.requiresSATUpdateNotice,
        expected.requiresSATUpdateNotice,
        'requiresSATUpdateNotice no coincide.',
      );
    }

    if (Array.isArray(expected.expectedCategoriesInOrder)) {
      const actualCategories = identification.obligationsDetected.map((o) => o.categoriaFiscal);
      assertEqual(
        actualCategories.length,
        expected.expectedCategoriesInOrder.length,
        'Cantidad de categorias en orden esperado no coincide.',
      );
      for (let i = 0; i < expected.expectedCategoriesInOrder.length; i++) {
        assertEqual(
          actualCategories[i],
          expected.expectedCategoriesInOrder[i],
          `Categoria en posicion ${i} no coincide.`,
        );
      }
    }

    if (Array.isArray(expected.expectedCategoriesAnyOrder)) {
      const actualCategories = identification.obligationsDetected.map((o) => o.categoriaFiscal);
      for (const cat of expected.expectedCategoriesAnyOrder)
        assertArrayIncludes(actualCategories, cat, 'No se encontro categoria esperada.');
    }

    if (expected.summaryChecks) {
      const s = identification.executiveSummary;
      for (const [k, v] of Object.entries(expected.summaryChecks))
        assertEqual(s[k], v, `executiveSummary.${k} no coincide.`);
    }
  }

  console.log('\n✅ Caso OK:', caseName);
}

function runSeccionD() {
  printSection('SECCIÓN D — IDENTIFICADOR DE RÉGIMEN FISCAL (taxRegimeIdentifier)');

  // ── D1: Solo salarios ───────────────────────────────────────────────────────
  runRegimeCase('D1 — Solo salarios (empleado formal)', {
    profile: {
      rfc: 'LOEA900101ABC',
      nombreCompleto: 'Luis Ortega Ejemplo',
      regimenesRegistradosSAT: ['SUELDOS_Y_SALARIOS'],
      obligacionesRegistradasSAT: ['ISR_SUELDOS'],
      esSocioAccionista: false,
      esResidenteExtranjeroConEstablecimientoPermanente: false,
      percibeIngresosRegimenPreferente: false,
      estadoCumplimientoSAT: 'AL_CORRIENTE',
    },
    incomeSources: [
      {
        idFuente: 'FUENTE_NOMINA_1',
        descripcionLibre: 'Empleo formal en empresa automotriz',
        tipoEconomicoDeclaradoPorUsuario: 'EMPLEO_FORMAL',
        existeRelacionSubordinada: true,
        quienPaga: 'PATRON',
        vendeBienes: false,
        prestaServiciosIndependientes: false,
        otorgaUsoGoceTemporalInmueble: false,
        usaPlataformaTecnologicaComoIntermediario: false,
        montoAnualEstimadoSinIVA: 360_000,
        montoMensualPromedioSinIVA: 30_000,
        emiteCFDI: false,
        recibeCFDINomina: true,
        clienteRetieneISR: false,
        clienteRetieneIVA: false,
        tratamientoIVAEsperado: 'NO_APLICA',
      },
    ],
    expected: {
      totalObligations: 1,
      requiresSATUpdateNotice: false,
      expectedCategoriesInOrder: [OBLIGATION_CATEGORY.SUELDOS_Y_SALARIOS],
      summaryChecks: {
        tieneSueldos: true,
        tieneActividadPorCuentaPropia: false,
        tieneMultiplesObligaciones: false,
      },
    },
  });

  // ── D2: Salario + freelance con RESICO ya registrado ────────────────────────
  runRegimeCase('D2 — Salario + freelance (servicios) con RESICO ya registrado', {
    profile: {
      rfc: 'MAPA920202DEF',
      nombreCompleto: 'Maria Paz Demo',
      regimenesRegistradosSAT: ['SUELDOS_Y_SALARIOS', 'RESICO_PERSONAS_FISICAS', 'ACTIVIDADES_EMPRESARIALES_Y_PROFESIONALES'],
      obligacionesRegistradasSAT: ['ISR_SUELDOS', 'ISR_RESICO', 'IVA_MENSUAL'],
      esSocioAccionista: false,
      esResidenteExtranjeroConEstablecimientoPermanente: false,
      percibeIngresosRegimenPreferente: false,
      estadoCumplimientoSAT: 'AL_CORRIENTE',
    },
    incomeSources: [
      {
        idFuente: 'FUENTE_NOMINA_2',
        descripcionLibre: 'Empleo formal de tiempo completo',
        tipoEconomicoDeclaradoPorUsuario: 'EMPLEO_FORMAL',
        existeRelacionSubordinada: true,
        quienPaga: 'PATRON',
        vendeBienes: false,
        prestaServiciosIndependientes: false,
        otorgaUsoGoceTemporalInmueble: false,
        usaPlataformaTecnologicaComoIntermediario: false,
        montoAnualEstimadoSinIVA: 240_000,
        montoMensualPromedioSinIVA: 20_000,
        emiteCFDI: false,
        recibeCFDINomina: true,
        clienteRetieneISR: false,
        clienteRetieneIVA: false,
        tratamientoIVAEsperado: 'NO_APLICA',
      },
      {
        idFuente: 'FUENTE_FREELANCE_2',
        descripcionLibre: 'Consultoria de software a persona moral mexicana',
        tipoEconomicoDeclaradoPorUsuario: 'FREELANCE_SERVICIOS',
        existeRelacionSubordinada: false,
        quienPaga: 'PERSONA_MORAL',
        vendeBienes: false,
        prestaServiciosIndependientes: true,
        otorgaUsoGoceTemporalInmueble: false,
        usaPlataformaTecnologicaComoIntermediario: false,
        montoAnualEstimadoSinIVA: 180_000,
        montoMensualPromedioSinIVA: 15_000,
        emiteCFDI: true,
        recibeCFDINomina: false,
        clienteRetieneISR: true,
        clienteRetieneIVA: true,
        tratamientoIVAEsperado: 'GRAVADO_16',
      },
    ],
    expected: {
      totalObligations: 2,
      requiresSATUpdateNotice: false,
      expectedCategoriesInOrder: [
        OBLIGATION_CATEGORY.SUELDOS_Y_SALARIOS,
        OBLIGATION_CATEGORY.SERVICIOS_PROFESIONALES_RESICO,
      ],
      summaryChecks: {
        tieneSueldos: true,
        tieneActividadPorCuentaPropia: true,
        tieneMultiplesObligaciones: true,
        tieneRESICO: true,
      },
    },
  });

  // ── D3: Servicios profesionales régimen general (socio/accionista) ──────────
  runRegimeCase('D3 — Servicios profesionales (régimen general) por ser socio/accionista', {
    profile: {
      rfc: 'ROCA930303GHI',
      nombreCompleto: 'Rocio Castillo',
      regimenesRegistradosSAT: ['ACTIVIDADES_EMPRESARIALES_Y_PROFESIONALES'],
      obligacionesRegistradasSAT: ['ISR_PAGO_PROVISIONAL_AE', 'IVA_MENSUAL'],
      esSocioAccionista: true,
      esResidenteExtranjeroConEstablecimientoPermanente: false,
      percibeIngresosRegimenPreferente: false,
      estadoCumplimientoSAT: 'AL_CORRIENTE',
    },
    incomeSources: [
      {
        idFuente: 'FUENTE_PROF_3',
        descripcionLibre: 'Consultoria de ingenieria',
        tipoEconomicoDeclaradoPorUsuario: 'FREELANCE_SERVICIOS',
        existeRelacionSubordinada: false,
        quienPaga: 'PERSONA_MORAL',
        vendeBienes: false,
        prestaServiciosIndependientes: true,
        otorgaUsoGoceTemporalInmueble: false,
        usaPlataformaTecnologicaComoIntermediario: false,
        montoAnualEstimadoSinIVA: 900_000,
        montoMensualPromedioSinIVA: 75_000,
        emiteCFDI: true,
        recibeCFDINomina: false,
        clienteRetieneISR: true,
        clienteRetieneIVA: true,
        tratamientoIVAEsperado: 'GRAVADO_16',
      },
    ],
    expected: {
      totalObligations: 1,
      requiresSATUpdateNotice: false,
      expectedCategoriesInOrder: [OBLIGATION_CATEGORY.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL],
      summaryChecks: {
        tieneRESICO: false,
        tieneActividadPorCuentaPropia: true,
      },
    },
  });

  // ── D4: Salario + arrendamiento con alerta SAT ──────────────────────────────
  runRegimeCase('D4 — Salario + arrendamiento con alerta de actualización SAT', {
    profile: {
      rfc: 'JIGA940404JKL',
      nombreCompleto: 'Jorge Ibarra',
      regimenesRegistradosSAT: ['SUELDOS_Y_SALARIOS'],
      obligacionesRegistradasSAT: ['ISR_SUELDOS'],
      esSocioAccionista: false,
      esResidenteExtranjeroConEstablecimientoPermanente: false,
      percibeIngresosRegimenPreferente: false,
      estadoCumplimientoSAT: 'AL_CORRIENTE',
    },
    incomeSources: [
      {
        idFuente: 'FUENTE_NOMINA_4',
        descripcionLibre: 'Empleo formal',
        tipoEconomicoDeclaradoPorUsuario: 'EMPLEO_FORMAL',
        existeRelacionSubordinada: true,
        quienPaga: 'PATRON',
        vendeBienes: false,
        prestaServiciosIndependientes: false,
        otorgaUsoGoceTemporalInmueble: false,
        usaPlataformaTecnologicaComoIntermediario: false,
        montoAnualEstimadoSinIVA: 420_000,
        montoMensualPromedioSinIVA: 35_000,
        emiteCFDI: false,
        recibeCFDINomina: true,
        clienteRetieneISR: false,
        clienteRetieneIVA: false,
        tratamientoIVAEsperado: 'NO_APLICA',
      },
      {
        idFuente: 'FUENTE_RENTA_4',
        descripcionLibre: 'Renta de departamento habitacional',
        tipoEconomicoDeclaradoPorUsuario: 'ARRENDAMIENTO',
        existeRelacionSubordinada: false,
        quienPaga: 'PERSONA_FISICA',
        vendeBienes: false,
        prestaServiciosIndependientes: false,
        otorgaUsoGoceTemporalInmueble: true,
        usaPlataformaTecnologicaComoIntermediario: false,
        montoAnualEstimadoSinIVA: 144_000,
        montoMensualPromedioSinIVA: 12_000,
        emiteCFDI: true,
        recibeCFDINomina: false,
        clienteRetieneISR: false,
        clienteRetieneIVA: false,
        tratamientoIVAEsperado: 'EXENTO',
      },
    ],
    expected: {
      totalObligations: 2,
      requiresSATUpdateNotice: true,
      expectedCategoriesInOrder: [
        OBLIGATION_CATEGORY.SUELDOS_Y_SALARIOS,
        OBLIGATION_CATEGORY.ARRENDAMIENTO_REGIMEN_GENERAL,
      ],
      summaryChecks: {
        tieneSueldos: true,
        tieneActividadPorCuentaPropia: true,
        tieneMultiplesObligaciones: true,
      },
    },
  });

  // ── D5: Plataformas tecnológicas ────────────────────────────────────────────
  runRegimeCase('D5 — Ingreso por plataformas tecnológicas (derivación a módulo)', {
    profile: {
      rfc: 'PETA950505MNO',
      nombreCompleto: 'Pedro Tapia',
      regimenesRegistradosSAT: ['PLATAFORMAS_TECNOLOGICAS'],
      obligacionesRegistradasSAT: [],
      esSocioAccionista: false,
      esResidenteExtranjeroConEstablecimientoPermanente: false,
      percibeIngresosRegimenPreferente: false,
      estadoCumplimientoSAT: 'AL_CORRIENTE',
    },
    incomeSources: [
      {
        idFuente: 'FUENTE_PLATAFORMA_5',
        descripcionLibre: 'Ingresos por plataforma (marketplace / apps)',
        tipoEconomicoDeclaradoPorUsuario: 'PLATAFORMA',
        existeRelacionSubordinada: false,
        quienPaga: 'PLATAFORMA',
        vendeBienes: false,
        prestaServiciosIndependientes: false,
        otorgaUsoGoceTemporalInmueble: false,
        usaPlataformaTecnologicaComoIntermediario: true,
        montoAnualEstimadoSinIVA: 120_000,
        montoMensualPromedioSinIVA: 10_000,
        emiteCFDI: true,
        recibeCFDINomina: false,
        clienteRetieneISR: true,
        clienteRetieneIVA: true,
        tratamientoIVAEsperado: 'GRAVADO_16',
      },
    ],
    expected: {
      totalObligations: 1,
      requiresSATUpdateNotice: false,
      expectedCategoriesInOrder: [OBLIGATION_CATEGORY.REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS],
    },
  });

  console.log('\n🎉 Sección D: todos los casos de régimen fiscal OK.');
}
