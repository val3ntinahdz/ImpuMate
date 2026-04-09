'use strict';

const db = require('../db');

// =============================================================================
// HELPERS
// =============================================================================

// Build SET clause for UPDATE: returns { sets, vals, nextIdx }
function buildSetClause(colMap, data, startIdx = 1) {
  const sets = [];
  const vals = [];
  let i = startIdx;
  for (const [js, col] of Object.entries(colMap)) {
    if (data[js] !== undefined) {
      sets.push(`${col} = $${i++}`);
      vals.push(data[js]);
    }
  }
  return { sets, vals, nextIdx: i };
}

// Build INSERT parts: returns { cols, vals, placeholders(offset) }
function buildInsertParts(colMap, data, phOffset = 1) {
  const cols = [];
  const vals = [];
  for (const [js, col] of Object.entries(colMap)) {
    if (data[js] !== undefined) {
      cols.push(col);
      vals.push(data[js]);
    }
  }
  const placeholders = vals.map((_, i) => `$${phOffset + i}`).join(', ');
  return { cols, vals, placeholders };
}

// =============================================================================
// ROW MAPPERS  (DB snake_case → JS camelCase)
// =============================================================================

function rowToUser(row) {
  return {
    id:                         row.id,
    email:                      row.email,
    passwordHash:               row.password_hash,
    rfc:                        row.rfc,
    nombreCompleto:             row.nombre_completo,
    esSocioAccionista:          row.es_socio_accionista,
    esResidenteExtranjeroConEP: row.es_residente_extranjero_con_ep,
    prefiereResico:             row.prefiere_resico_en_fuentes_elegibles,
    usesBlindRentalDeduction:   row.uses_blind_rental_deduction,
    estadoCumplimientoSat:      row.estado_cumplimiento_sat,
    createdAt:                  row.created_at,
    updatedAt:                  row.updated_at,
  };
}

async function fetchUserWithArrays(row) {
  if (!row) return null;
  const user = rowToUser(row);
  const [regimesRes, obligationsRes] = await Promise.all([
    db.query('SELECT regime_code FROM user_sat_regimes WHERE user_id = $1', [row.id]),
    db.query('SELECT obligation_code FROM user_sat_obligations WHERE user_id = $1', [row.id]),
  ]);
  user.satRegimes     = regimesRes.rows.map(r => r.regime_code);
  user.satObligations = obligationsRes.rows.map(r => r.obligation_code);
  return user;
}

function rowToSession(row) {
  if (!row) return null;
  return {
    id:                   row.id,
    userId:               row.user_id,
    exerciseYear:         row.exercise_year,
    isActive:             row.is_active,
    isrAlreadyWithheldMxn: parseFloat(row.isr_already_withheld_by_salary_mxn) || 0,
    ivaAlreadyPaidMxn:    parseFloat(row.iva_already_paid_to_sat_mxn) || 0,
    bufferHorizonMonths:  row.buffer_horizon_months,
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
  };
}

function rowToSource(row) {
  if (!row) return null;
  return {
    id:                         row.id,
    sessionId:                  row.session_id,
    idFuente:                   row.source_key,
    descripcion:                row.description,
    tipoEconomico:              row.declared_economic_type,
    montoAnualEstimado:         parseFloat(row.monto_anual_estimado_sin_iva) || 0,
    quienPaga:                  row.quien_paga,
    existeRelacionSubordinada:  row.existe_relacion_subordinada,
    recibeCfdiNomina:           row.recibe_cfdi_nomina,
    vendeBienes:                row.vende_bienes,
    prestaSErvcioIndependiente: row.presta_servicios_independientes,
    otorgaUsoGoceInmueble:      row.otorga_uso_goce_temporal_inmueble,
    usaPlataformaTecnologica:   row.usa_plataforma_tecnologica,
    emiteCFDI:                  row.emite_cfdi,
    clienteRetieneISR:          row.cliente_retiene_isr,
    clienteRetieneIVA:          row.cliente_retiene_iva,
    isSubjectToIva:             row.is_subject_to_iva,
    solicitaTributarEnResico:   row.solicita_tributar_en_resico,
    createdAt:                  row.created_at,
  };
}

function rowToExpense(row) {
  if (!row) return null;
  return {
    id:                                    row.id,
    sessionId:                             row.session_id,
    category:                              row.category,
    amountMXN:                             parseFloat(row.amount_mxn) || 0,
    hasCFDI:                               row.has_cfdi,
    paymentMethod:                         row.payment_method,
    invoiceReceiverRFCMatchesTaxpayer:     row.invoice_receiver_rfc_matches_taxpayer,
    paidFromTaxpayerAccount:               row.paid_from_taxpayer_account,
    paidInRelevantFiscalYear:              row.paid_in_relevant_fiscal_year,
    beneficiaryRelationship:               row.beneficiary_relationship,
    providerHasRequiredProfessionalLicense: row.provider_has_required_professional_license,
    schoolLevel:                           row.school_level,
    hasOfficialSchoolRecognition:          row.has_official_school_recognition,
    schoolTransportMandatory:              row.school_transport_mandatory,
    invoiceSeparatesTransport:             row.invoice_separates_transport,
    disabilityCertificate:                 row.disability_certificate,
    disabilityPercentage:                  row.disability_percentage !== null
      ? parseFloat(row.disability_percentage) : null,
    donationRecipientType:                 row.donation_recipient_type,
    donationIsOnerousOrRemunerative:       row.donation_is_onerous_or_remunerative,
    meetsRetirementPermanenceRequirement:  row.meets_retirement_permanence_requirement,
    interestAmountIsRealInterest:          row.interest_amount_is_real_interest,
    mortgageCreditWithin750kUdisLimit:     row.mortgage_credit_within_750k_udis,
    isStrictlyIndispensableForActivity:    row.is_strictly_indispensable_for_activity,
    isActuallyPaid:                        row.is_actually_paid,
    assetType:                             row.asset_type,
    createdAt:                             row.created_at,
    updatedAt:                             row.updated_at,
  };
}

function rowToExpenseEvaluation(row) {
  if (!row) return null;
  return {
    id:                              row.id,
    expenseId:                       row.expense_id,
    sessionId:                       row.session_id,
    deductibleForISR:                row.deductible_for_isr,
    deductionKind:                   row.deduction_kind,
    deductibleAmountMXN:             parseFloat(row.deductible_amount_mxn) || 0,
    deductiblePercentageOverExpense: parseFloat(row.deductible_percentage_over_expense) || 0,
    capAppliedDescription:           row.cap_applied_description,
    globalPersonalCapAtEvalMXN:      row.global_personal_cap_at_eval_mxn !== null
      ? parseFloat(row.global_personal_cap_at_eval_mxn)
      : null,
    consumedGlobalCapBeforeEvalMXN:  row.consumed_global_cap_before_eval_mxn !== null
      ? parseFloat(row.consumed_global_cap_before_eval_mxn)
      : null,
    generatesIVAAcreditable:         row.generates_iva_acreditable,
    estimatedIVAAcreditableMXN:      parseFloat(row.estimated_iva_acreditable_mxn) || 0,
    createdAt:                       row.created_at,
  };
}

// =============================================================================
// COLUMN MAPS  (JS camelCase → DB snake_case)
// =============================================================================

const USER_COL_MAP = {
  rfc:                        'rfc',
  nombreCompleto:             'nombre_completo',
  esSocioAccionista:          'es_socio_accionista',
  esResidenteExtranjeroConEP: 'es_residente_extranjero_con_ep',
  prefiereResico:             'prefiere_resico_en_fuentes_elegibles',
  usesBlindRentalDeduction:   'uses_blind_rental_deduction',
  estadoCumplimientoSat:      'estado_cumplimiento_sat',
  passwordHash:               'password_hash',
};

const SESSION_COL_MAP = {
  isrAlreadyWithheldMxn: 'isr_already_withheld_by_salary_mxn',
  ivaAlreadyPaidMxn:     'iva_already_paid_to_sat_mxn',
  bufferHorizonMonths:   'buffer_horizon_months',
};

const SOURCE_COL_MAP = {
  idFuente:                   'source_key',
  descripcion:                'description',
  tipoEconomico:              'declared_economic_type',
  montoAnualEstimado:         'monto_anual_estimado_sin_iva',
  quienPaga:                  'quien_paga',
  existeRelacionSubordinada:  'existe_relacion_subordinada',
  recibeCfdiNomina:           'recibe_cfdi_nomina',
  vendeBienes:                'vende_bienes',
  prestaSErvcioIndependiente: 'presta_servicios_independientes',
  otorgaUsoGoceInmueble:      'otorga_uso_goce_temporal_inmueble',
  usaPlataformaTecnologica:   'usa_plataforma_tecnologica',
  emiteCFDI:                  'emite_cfdi',
  clienteRetieneISR:          'cliente_retiene_isr',
  clienteRetieneIVA:          'cliente_retiene_iva',
  isSubjectToIva:             'is_subject_to_iva',
  solicitaTributarEnResico:   'solicita_tributar_en_resico',
};

const EXPENSE_COL_MAP = {
  category:                               'category',
  amountMXN:                              'amount_mxn',
  hasCFDI:                                'has_cfdi',
  paymentMethod:                          'payment_method',
  invoiceReceiverRFCMatchesTaxpayer:      'invoice_receiver_rfc_matches_taxpayer',
  paidFromTaxpayerAccount:                'paid_from_taxpayer_account',
  paidInRelevantFiscalYear:               'paid_in_relevant_fiscal_year',
  beneficiaryRelationship:                'beneficiary_relationship',
  providerHasRequiredProfessionalLicense: 'provider_has_required_professional_license',
  schoolLevel:                            'school_level',
  hasOfficialSchoolRecognition:           'has_official_school_recognition',
  schoolTransportMandatory:               'school_transport_mandatory',
  invoiceSeparatesTransport:              'invoice_separates_transport',
  disabilityCertificate:                  'disability_certificate',
  disabilityPercentage:                   'disability_percentage',
  donationRecipientType:                  'donation_recipient_type',
  donationIsOnerousOrRemunerative:        'donation_is_onerous_or_remunerative',
  meetsRetirementPermanenceRequirement:   'meets_retirement_permanence_requirement',
  interestAmountIsRealInterest:           'interest_amount_is_real_interest',
  mortgageCreditWithin750kUdisLimit:      'mortgage_credit_within_750k_udis',
  isStrictlyIndispensableForActivity:     'is_strictly_indispensable_for_activity',
  isActuallyPaid:                         'is_actually_paid',
  assetType:                              'asset_type',
};

const EXPENSE_EVAL_COL_MAP = {
  deductibleForISR:                'deductible_for_isr',
  deductionKind:                   'deduction_kind',
  deductibleAmountMXN:             'deductible_amount_mxn',
  deductiblePercentageOverExpense: 'deductible_percentage_over_expense',
  capAppliedDescription:           'cap_applied_description',
  globalPersonalCapAtEvalMXN:      'global_personal_cap_at_eval_mxn',
  consumedGlobalCapBeforeEvalMXN:  'consumed_global_cap_before_eval_mxn',
  generatesIVAAcreditable:         'generates_iva_acreditable',
  estimatedIVAAcreditableMXN:      'estimated_iva_acreditable_mxn',
};

// =============================================================================
// COLLECTIONS
// =============================================================================

// ── users ─────────────────────────────────────────────────────────────────────
const users = {
  async create({ email, passwordHash, rfc, nombreCompleto }) {
    const res = await db.query(
      `INSERT INTO users (email, password_hash, rfc, nombre_completo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, passwordHash, rfc || null, nombreCompleto || null],
    );
    return fetchUserWithArrays(res.rows[0]);
  },

  async findById(id) {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return fetchUserWithArrays(res.rows[0] || null);
  },

  async findByEmail(email) {
    const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return await fetchUserWithArrays(res.rows[0] || null);
  },

  async update(id, data) {
    const { satRegimes, satObligations, ...rest } = data;
    const { sets, vals, nextIdx } = buildSetClause(USER_COL_MAP, rest);

    if (sets.length > 0) {
      sets.push('updated_at = NOW()');
      vals.push(id);
      await db.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${nextIdx}`,
        vals,
      );
    }

    if (satRegimes !== undefined) {
      await db.query('DELETE FROM user_sat_regimes WHERE user_id = $1', [id]);
      for (const code of satRegimes) {
        await db.query(
          'INSERT INTO user_sat_regimes (user_id, regime_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, code],
        );
      }
    }

    if (satObligations !== undefined) {
      await db.query('DELETE FROM user_sat_obligations WHERE user_id = $1', [id]);
      for (const code of satObligations) {
        await db.query(
          'INSERT INTO user_sat_obligations (user_id, obligation_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, code],
        );
      }
    }

    return this.findById(id);
  },
};

// ── fiscal_sessions ───────────────────────────────────────────────────────────
const fiscalSessions = {
  async create({ userId, exerciseYear, isrAlreadyWithheldMxn = 0, ivaAlreadyPaidMxn = 0, bufferHorizonMonths = 3 }) {
    const res = await db.query(
      `INSERT INTO fiscal_sessions
         (user_id, exercise_year, isr_already_withheld_by_salary_mxn,
          iva_already_paid_to_sat_mxn, buffer_horizon_months)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, exerciseYear, isrAlreadyWithheldMxn, ivaAlreadyPaidMxn, bufferHorizonMonths],
    );
    return rowToSession(res.rows[0]);
  },

  async findByUser(userId) {
    const res = await db.query(
      'SELECT * FROM fiscal_sessions WHERE user_id = $1 ORDER BY exercise_year DESC',
      [userId],
    );
    return res.rows.map(rowToSession);
  },

  async findByIdAndUser(id, userId) {
    const res = await db.query(
      'SELECT * FROM fiscal_sessions WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return rowToSession(res.rows[0] || null);
  },

  async findByUserAndYear(userId, year) {
    const res = await db.query(
      'SELECT * FROM fiscal_sessions WHERE user_id = $1 AND exercise_year = $2',
      [userId, year],
    );
    return rowToSession(res.rows[0] || null);
  },

  async update(id, data) {
    const { sets, vals, nextIdx } = buildSetClause(SESSION_COL_MAP, data);
    if (!sets.length) {
      const res = await db.query('SELECT * FROM fiscal_sessions WHERE id = $1', [id]);
      return rowToSession(res.rows[0] || null);
    }
    sets.push('updated_at = NOW()');
    vals.push(id);
    const res = await db.query(
      `UPDATE fiscal_sessions SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
      vals,
    );
    return rowToSession(res.rows[0]);
  },

  async remove(id) {
    await db.query('DELETE FROM fiscal_sessions WHERE id = $1', [id]);
  },
};

// ── income_sources ────────────────────────────────────────────────────────────
const incomeSources = {
  async create(data) {
    const { sessionId, ...rest } = data;
    const { cols, vals, placeholders } = buildInsertParts(SOURCE_COL_MAP, rest, 2);

    const res = await db.query(
      `INSERT INTO income_sources
         (session_id, user_id, ${cols.join(', ')})
       VALUES (
         $1,
         (SELECT user_id FROM fiscal_sessions WHERE id = $1),
         ${placeholders}
       ) RETURNING *`,
      [sessionId, ...vals],
    );
    return rowToSource(res.rows[0]);
  },

  async findBySession(sessionId) {
    const res = await db.query(
      'SELECT * FROM income_sources WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId],
    );
    return res.rows.map(rowToSource);
  },

  async findByIdAndSession(id, sessionId) {
    const res = await db.query(
      'SELECT * FROM income_sources WHERE id = $1 AND session_id = $2',
      [id, sessionId],
    );
    return rowToSource(res.rows[0] || null);
  },

  async update(id, data) {
    const { sets, vals, nextIdx } = buildSetClause(SOURCE_COL_MAP, data);
    if (!sets.length) {
      const res = await db.query('SELECT * FROM income_sources WHERE id = $1', [id]);
      return rowToSource(res.rows[0] || null);
    }
    sets.push('updated_at = NOW()');
    vals.push(id);
    const res = await db.query(
      `UPDATE income_sources SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
      vals,
    );
    return rowToSource(res.rows[0]);
  },

  async remove(id) {
    await db.query('DELETE FROM income_sources WHERE id = $1', [id]);
  },
};

// ── regime_results (stored as JSONB in fiscal_sessions) ───────────────────────
const regimeResults = {
  async save(sessionId, data) {
    await db.query(
      'UPDATE fiscal_sessions SET regime_result_data = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(data), sessionId],
    );
  },

  async findBySession(sessionId) {
    const res = await db.query(
      'SELECT regime_result_data FROM fiscal_sessions WHERE id = $1',
      [sessionId],
    );
    return res.rows[0]?.regime_result_data || null;
  },
};

// ── expenses ──────────────────────────────────────────────────────────────────
const expenses = {
  async create(data) {
    const { sessionId, ...rest } = data;
    const { cols, vals, placeholders } = buildInsertParts(EXPENSE_COL_MAP, rest, 2);

    if (!cols.length) throw new Error('No expense fields provided.');

    const res = await db.query(
      `INSERT INTO expenses
         (session_id, user_id, ${cols.join(', ')})
       VALUES (
         $1,
         (SELECT user_id FROM fiscal_sessions WHERE id = $1),
         ${placeholders}
       ) RETURNING *`,
      [sessionId, ...vals],
    );
    return rowToExpense(res.rows[0]);
  },

  async findBySession(sessionId) {
    const res = await db.query(
      'SELECT * FROM expenses WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId],
    );
    return res.rows.map(rowToExpense);
  },

  async findByIdAndSession(id, sessionId) {
    const res = await db.query(
      'SELECT * FROM expenses WHERE id = $1 AND session_id = $2',
      [id, sessionId],
    );
    return rowToExpense(res.rows[0] || null);
  },

  async update(id, data) {
    const { sets, vals, nextIdx } = buildSetClause(EXPENSE_COL_MAP, data);
    if (!sets.length) {
      const res = await db.query('SELECT * FROM expenses WHERE id = $1', [id]);
      return rowToExpense(res.rows[0] || null);
    }
    sets.push('updated_at = NOW()');
    vals.push(id);
    const res = await db.query(
      `UPDATE expenses SET ${sets.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
      vals,
    );
    return rowToExpense(res.rows[0]);
  },

  async remove(id) {
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);
  },
};

// ── expense_evaluation_results ───────────────────────────────────────────────
const expenseEvaluations = {
  async saveForExpense(expenseId, sessionId, data) {
    const { cols, vals, placeholders } = buildInsertParts(EXPENSE_EVAL_COL_MAP, data, 3);

    if (!cols.length) throw new Error('No expense evaluation fields provided.');

    const updateAssignments = Object.values(EXPENSE_EVAL_COL_MAP)
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');

    const res = await db.query(
      `INSERT INTO expense_evaluation_results
         (expense_id, session_id, ${cols.join(', ')})
       VALUES ($1, $2, ${placeholders})
       ON CONFLICT (expense_id) DO UPDATE SET
         session_id = EXCLUDED.session_id,
         ${updateAssignments}
       RETURNING *`,
      [expenseId, sessionId, ...vals],
    );

    return rowToExpenseEvaluation(res.rows[0]);
  },

  async findByExpense(expenseId) {
    const res = await db.query(
      'SELECT * FROM expense_evaluation_results WHERE expense_id = $1',
      [expenseId],
    );
    return rowToExpenseEvaluation(res.rows[0] || null);
  },

  async findBySession(sessionId) {
    const res = await db.query(
      'SELECT * FROM expense_evaluation_results WHERE session_id = $1',
      [sessionId],
    );
    return res.rows.map(rowToExpenseEvaluation);
  },
};

// ── deductions_accumulator_snapshots ──────────────────────────────────────────
const accumulatorSnapshots = {
  async save(sessionId, data) {
    const details = JSON.stringify({
      totalDeductiblesMxn: data.totalDeductiblesMxn,
      approvedExpenses:    data.approvedExpenses,
      rejectedExpenses:    data.rejectedExpenses,
    });

    await db.query(
      `INSERT INTO deductions_accumulator_snapshots
         (session_id, total_personal_deductibles_mxn, total_activity_deductibles_mxn,
          total_iva_acreditable_mxn, approved_count, rejected_count,
          details_data, last_recalculated_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (session_id) DO UPDATE SET
         total_personal_deductibles_mxn = EXCLUDED.total_personal_deductibles_mxn,
         total_activity_deductibles_mxn = EXCLUDED.total_activity_deductibles_mxn,
         total_iva_acreditable_mxn      = EXCLUDED.total_iva_acreditable_mxn,
         approved_count                 = EXCLUDED.approved_count,
         rejected_count                 = EXCLUDED.rejected_count,
         details_data                   = EXCLUDED.details_data,
         last_recalculated_at           = NOW(),
         updated_at                     = NOW()`,
      [
        sessionId,
        data.totalPersonalDeductiblesMxn,
        data.totalActivityDeductiblesMxn,
        data.totalIvaAcreditableMxn,
        data.approvedCount,
        data.rejectedCount,
        details,
      ],
    );
  },

  async findBySession(sessionId) {
    const res = await db.query(
      'SELECT * FROM deductions_accumulator_snapshots WHERE session_id = $1',
      [sessionId],
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    const details = row.details_data || {};
    return {
      totalPersonalDeductiblesMxn: parseFloat(row.total_personal_deductibles_mxn) || 0,
      totalActivityDeductiblesMxn: parseFloat(row.total_activity_deductibles_mxn) || 0,
      totalIvaAcreditableMxn:      parseFloat(row.total_iva_acreditable_mxn) || 0,
      approvedCount:               row.approved_count,
      rejectedCount:               row.rejected_count,
      ...details,
      lastRecalculatedAt:          row.last_recalculated_at,
    };
  },
};

// ── tax_buffer_results ────────────────────────────────────────────────────────
const taxBufferResults = {
  async save(sessionId, data) {
    await db.query(
      `INSERT INTO tax_buffer_results
         (session_id, recommended_monthly_buffer, estimated_iva_causado,
          estimated_iva_acreditable, estimated_iva_owed, total_tax_liability,
          total_with_safety_margin, remaining_after_credits,
          buffer_horizon_months, safety_margin_applied,
          isr_by_obligation, taxable_base_by_obligation, result_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (session_id) DO UPDATE SET
         recommended_monthly_buffer = EXCLUDED.recommended_monthly_buffer,
         estimated_iva_causado       = EXCLUDED.estimated_iva_causado,
         estimated_iva_acreditable   = EXCLUDED.estimated_iva_acreditable,
         estimated_iva_owed          = EXCLUDED.estimated_iva_owed,
         total_tax_liability         = EXCLUDED.total_tax_liability,
         total_with_safety_margin    = EXCLUDED.total_with_safety_margin,
         remaining_after_credits     = EXCLUDED.remaining_after_credits,
         buffer_horizon_months       = EXCLUDED.buffer_horizon_months,
         safety_margin_applied       = EXCLUDED.safety_margin_applied,
         isr_by_obligation           = EXCLUDED.isr_by_obligation,
         taxable_base_by_obligation  = EXCLUDED.taxable_base_by_obligation,
         result_data                 = EXCLUDED.result_data`,
      [
        sessionId,
        data.recommendedMonthlyBuffer,
        data.estimatedIVACausado,
        data.estimatedIVAAcreditable,
        data.estimatedIVAOwed,
        data.totalTaxLiability,
        data.totalWithSafetyMargin,
        data.remainingTaxAfterCredits,
        data.bufferHorizonMonths,
        data.safetyMarginApplied,
        JSON.stringify(data.estimatedISRByObligation || {}),
        JSON.stringify(data.taxableBaseByObligation  || {}),
        JSON.stringify(data),
      ],
    );
  },

  async findBySession(sessionId) {
    const res = await db.query(
      'SELECT result_data FROM tax_buffer_results WHERE session_id = $1',
      [sessionId],
    );
    return res.rows[0]?.result_data || null;
  },
};

module.exports = {
  users,
  fiscalSessions,
  incomeSources,
  regimeResults,
  expenses,
  expenseEvaluations,
  accumulatorSnapshots,
  taxBufferResults,
};
