-- =============================================================================
-- ImpuMate — seed_fiscal_parameters.sql
-- Ejercicio fiscal 2026
-- =============================================================================
--
-- Este archivo siembra los parámetros fiscales oficiales del ejercicio 2026.
-- Todos los valores provienen de fiscalConstants.js (fuente única de verdad).
--
-- FUENTES OFICIALES:
--   UMA 2026:        INEGI — https://www.inegi.org.mx/.../uma2026.pdf
--   IVA:             LIVA art. 1
--   ISR art. 152:    LISR — https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
--   ISR art. 113-E:  LISR (RESICO PF)
--   Deducciones:     SAT minisitio DeduccionesPersonales
--   Colegiaturas:    SAT minisitio colegiaturas
--
-- NOTA: Ejecutar DESPUÉS de schema.sql.
-- NOTA: Los valores de la tarifa ISR art. 152 corresponden al ejercicio 2025
--       como referencia educativa — actualizar con Anexo 8 RMF 2026 cuando
--       sea publicado en el DOF.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- A. PARÁMETROS GENERALES 2026
-- -----------------------------------------------------------------------------

INSERT INTO fiscal_parameters (
  exercise_year,
  annual_uma_value_mxn,
  general_iva_rate,
  resico_annual_income_limit_mxn,
  banked_payment_threshold_mxn,
  personal_deductions_uma_multiplier,
  personal_deductions_income_pct,
  optical_lenses_cap_mxn,
  funeral_cap_uma_multiplier,
  mortgage_credit_udi_limit,
  donation_cap_general_pct,
  donation_cap_government_pct,
  retirement_cap_income_pct,
  retirement_cap_uma_multiplier,
  inv_rate_construction_business,
  inv_rate_installation_business,
  inv_rate_office_furniture,
  inv_rate_computer_equipment_business,
  inv_rate_automobile,
  inv_rate_construction_rental,
  inv_rate_installation_rental,
  inv_rate_computer_equipment_rental,
  inv_rate_other_tangible_rental,
  tuition_cap_preescolar,
  tuition_cap_primaria,
  tuition_cap_secundaria,
  tuition_cap_profesional_tecnico,
  tuition_cap_bachillerato
) VALUES (
  2026,
  42794.64,       -- ANNUAL_UMA_VALUE_MXN (INEGI 2026)
  0.16,           -- GENERAL_IVA_RATE (LIVA art. 1)
  3500000.00,     -- RESICO_ANNUAL_INCOME_LIMIT_MXN (LISR art. 113-E)
  2000.00,        -- BANKED_PAYMENT_THRESHOLD_MXN (LISR art. 27)
  5,              -- personal_deductions_uma_multiplier (5 UMA)
  0.15,           -- personal_deductions_income_pct (15% del ingreso)
  2500.00,        -- optical_lenses_cap_mxn
  1,              -- funeral_cap_uma_multiplier (1 UMA)
  750000.00,      -- mortgage_credit_udi_limit (750,000 UDIS)
  0.07,           -- donation_cap_general_pct (7%)
  0.04,           -- donation_cap_government_pct (4%)
  0.10,           -- retirement_cap_income_pct (10%)
  5,              -- retirement_cap_uma_multiplier (5 UMA)
  -- Tasas inversiones negocio (LISR arts. 34, 103-105)
  0.05,           -- construcción
  0.10,           -- instalaciones
  0.10,           -- mobiliario de oficina
  0.30,           -- equipo de cómputo
  0.25,           -- automóvil
  -- Tasas inversiones arrendamiento (LISR arts. 115, 149)
  0.05,           -- construcción
  0.10,           -- instalaciones
  0.30,           -- equipo de cómputo
  0.10,           -- otro activo tangible
  -- Topes colegiaturas (SAT minisitio colegiaturas)
  14200.00,       -- PREESCOLAR
  12900.00,       -- PRIMARIA
  19900.00,       -- SECUNDARIA
  17100.00,       -- PROFESIONAL_TÉCNICO
  24500.00        -- BACHILLERATO
);


-- -----------------------------------------------------------------------------
-- B. TARIFA ANUAL ISR — ART. 152 LISR — 11 TRAMOS (2026)
-- -----------------------------------------------------------------------------
-- Mecánica: ISR = fixed_fee + (base_gravable − lower_bound) × marginal_rate
-- NULL en upper_bound_mxn = último tramo (sin límite superior)
-- -----------------------------------------------------------------------------

INSERT INTO isr_annual_tariff_brackets
  (exercise_year, bracket_order, lower_bound_mxn, upper_bound_mxn, fixed_fee_mxn, marginal_rate)
VALUES
  (2026,  1,        0.01,       8952.49,        0.00,         0.019200),
  (2026,  2,     8952.50,      75984.55,      171.88,         0.064000),
  (2026,  3,    75984.56,     133536.07,     4461.94,         0.108800),
  (2026,  4,   133536.08,     155229.80,    10723.55,         0.160000),
  (2026,  5,   155229.81,     185852.57,    14194.54,         0.179200),
  (2026,  6,   185852.58,     374837.88,    19682.13,         0.213600),
  (2026,  7,   374837.89,     590795.99,    60049.40,         0.235200),
  (2026,  8,   590796.00,    1127926.84,   110842.74,         0.300000),
  (2026,  9,  1127926.85,    1503902.46,   271981.99,         0.320000),
  (2026, 10,  1503902.47,    4511707.37,   392294.17,         0.340000),
  (2026, 11,  4511707.38,          NULL,  1414947.85,         0.350000);


-- -----------------------------------------------------------------------------
-- C. TASAS ISR RESICO — ART. 113-E LISR — 5 TRAMOS (2026)
-- -----------------------------------------------------------------------------
-- Mecánica: tasa PLANA sobre TOTAL de ingresos cobrados (no marginal).
-- Al cruzar un umbral, TODA la base paga la nueva tasa.
-- NULL en upper_bound_mxn = último tramo (sin límite superior).
-- -----------------------------------------------------------------------------

INSERT INTO resico_isr_rate_brackets
  (exercise_year, bracket_order, upper_bound_mxn, rate)
VALUES
  (2026, 1,   300000.00, 0.010000),   -- hasta $300k → 1.0%
  (2026, 2,   600000.00, 0.011000),   -- hasta $600k → 1.1%
  (2026, 3,  1000000.00, 0.013000),   -- hasta $1M   → 1.3%
  (2026, 4,  2000000.00, 0.017000),   -- hasta $2M   → 1.7%
  (2026, 5,        NULL, 0.025000);   -- hasta $3.5M → 2.5% (límite RESICO)


-- -----------------------------------------------------------------------------
-- D. MÁRGENES DE SEGURIDAD DEL BUFFER POR OBLIGACIÓN (2026)
-- -----------------------------------------------------------------------------
-- Son parámetros de PRODUCTO (no de ley), basados en nivel de variabilidad
-- y riesgo de cada régimen. Pueden ajustarse sin cambio de schema.
--
-- Interpretación: 1.20 = ISR calculado × 1.20 (20% de reserva adicional)
--
-- Lógica de diseño:
--   - Sueldos (1.05):  el patrón ya retuvo la mayoría → riesgo bajo
--   - Régimen general actividad/servicios (1.20): ingreso variable → riesgo alto
--   - Arrendamiento régimen general (1.15): moderado
--   - RESICO (1.10): tasa directa, menos incertidumbre que régimen general
-- -----------------------------------------------------------------------------

INSERT INTO buffer_safety_margins
  (exercise_year, obligation_category, margin_multiplier)
VALUES
  (2026, 'SUELDOS_Y_SALARIOS',                       1.05),
  (2026, 'ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL',     1.20),
  (2026, 'SERVICIOS_PROFESIONALES_REGIMEN_GENERAL',   1.20),
  (2026, 'ARRENDAMIENTO_REGIMEN_GENERAL',             1.15),
  (2026, 'ACTIVIDAD_EMPRESARIAL_RESICO',              1.10),
  (2026, 'SERVICIOS_PROFESIONALES_RESICO',            1.10),
  (2026, 'ARRENDAMIENTO_RESICO',                      1.10),
  (2026, 'REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS', 1.25),
  -- DEFAULT se almacena como 'NO_DETERMINADA' para capturar casos edge
  (2026, 'NO_DETERMINADA',                            1.15);


-- -----------------------------------------------------------------------------
-- E. USUARIOS DE DEMO + CATÁLOGOS SAT NORMALIZADOS
-- -----------------------------------------------------------------------------
-- Estos registros permiten probar localmente el flujo completo:
-- perfil -> sesión -> identificación -> gastos -> buffer.
-- Se usan UUIDs fijos para mantener FKs legibles en el seed.
-- -----------------------------------------------------------------------------

INSERT INTO users (
  id,
  email,
  password_hash,
  rfc,
  nombre_completo,
  es_socio_accionista,
  es_residente_extranjero_con_ep,
  percibe_ingresos_regimen_preferente,
  prefiere_resico_en_fuentes_elegibles,
  uses_blind_rental_deduction,
  estado_cumplimiento_sat
) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'laura.torres@example.com',
    '$2b$10$demoHashForLauraTorres000000000000000000000000000000000',
    'TOTL900101ABC',
    'Laura Torres Lopez',
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    'AL_CORRIENTE'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'miguel.ortega@example.com',
    '$2b$10$demoHashForMiguelOrtega0000000000000000000000000000000',
    'OEGM8803159Z1',
    'Miguel Ortega Martinez',
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    'EN_REVISION'
  );

INSERT INTO user_sat_regimes (user_id, regime_code) VALUES
  ('11111111-1111-4111-8111-111111111111', 'SUELDOS_Y_SALARIOS'),
  ('11111111-1111-4111-8111-111111111111', 'RESICO_PERSONAS_FISICAS'),
  ('22222222-2222-4222-8222-222222222222', 'ARRENDAMIENTO');

INSERT INTO user_sat_obligations (user_id, obligation_code) VALUES
  ('11111111-1111-4111-8111-111111111111', 'ISR_SUELDOS'),
  ('11111111-1111-4111-8111-111111111111', 'ISR_RESICO'),
  ('11111111-1111-4111-8111-111111111111', 'IVA_MENSUAL'),
  ('22222222-2222-4222-8222-222222222222', 'ISR_ARRENDAMIENTO'),
  ('22222222-2222-4222-8222-222222222222', 'DECLARACION_ANUAL');


-- -----------------------------------------------------------------------------
-- F. SESIONES FISCALES DE DEMO
-- -----------------------------------------------------------------------------

INSERT INTO fiscal_sessions (
  id,
  user_id,
  exercise_year,
  is_active,
  annual_total_income_mxn,
  current_year_accum_income_retirement_mxn,
  prev_year_accum_income_donation_mxn,
  regime_result_data,
  isr_already_withheld_by_salary_mxn,
  iva_already_paid_to_sat_mxn,
  buffer_horizon_months
) VALUES
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    2026,
    TRUE,
    1260000.00,
    18000.00,
    6000.00,
    '{
      "fuentes": [
        {
          "idFuente": "nomina_principal",
          "baseClassification": "SUELDOS_Y_SALARIOS",
          "categoriaFiscal": "SUELDOS_Y_SALARIOS",
          "periodicidadISR": "RETENCION_NOMINA",
          "periodicidadIVA": "NO_APLICA"
        },
        {
          "idFuente": "consultoria_it",
          "baseClassification": "SERVICIOS_PROFESIONALES",
          "categoriaFiscal": "SERVICIOS_PROFESIONALES_RESICO",
          "periodicidadISR": "MENSUAL",
          "periodicidadIVA": "MENSUAL"
        },
        {
          "idFuente": "tienda_marketplace",
          "baseClassification": "PLATAFORMAS_TECNOLOGICAS",
          "categoriaFiscal": "REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS",
          "periodicidadISR": "POR_DETERMINAR",
          "periodicidadIVA": "POR_DETERMINAR"
        }
      ],
      "summary": {
        "totalObligaciones": 3,
        "tieneMultiplesObligaciones": true,
        "tieneResico": true,
        "tieneSueldos": true,
        "tieneActividadCuentaPropia": true
      }
    }'::jsonb,
    84500.00,
    12500.00,
    3
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    2026,
    TRUE,
    420000.00,
    0.00,
    2500.00,
    '{
      "fuentes": [
        {
          "idFuente": "departamento_narvarte",
          "baseClassification": "ARRENDAMIENTO",
          "categoriaFiscal": "ARRENDAMIENTO_REGIMEN_GENERAL",
          "periodicidadISR": "MENSUAL",
          "periodicidadIVA": "NO_APLICA"
        }
      ],
      "summary": {
        "totalObligaciones": 1,
        "tieneMultiplesObligaciones": false,
        "tieneResico": false,
        "tieneSueldos": false,
        "tieneActividadCuentaPropia": true
      }
    }'::jsonb,
    0.00,
    3200.00,
    2
  );


-- -----------------------------------------------------------------------------
-- G. FUENTES DE INGRESO + IDENTIFICACIÓN DE RÉGIMEN
-- -----------------------------------------------------------------------------

INSERT INTO income_sources (
  id,
  session_id,
  user_id,
  source_key,
  description,
  declared_economic_type,
  existe_relacion_subordinada,
  quien_paga,
  vende_bienes,
  presta_servicios_independientes,
  otorga_uso_goce_temporal_inmueble,
  usa_plataforma_tecnologica,
  monto_anual_estimado_sin_iva,
  monto_mensual_promedio_sin_iva,
  emite_cfdi,
  recibe_cfdi_nomina,
  cliente_retiene_isr,
  cliente_retiene_iva,
  tratamiento_iva_esperado,
  solicita_tributar_en_resico,
  is_subject_to_iva
) VALUES
  (
    '55555555-5555-4555-8555-555555555555',
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'nomina_principal',
    'Relacion laboral de tiempo completo',
    'EMPLEO',
    TRUE,
    'EMPRESA_NACIONAL',
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    720000.00,
    60000.00,
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    'NO_APLICA',
    FALSE,
    FALSE
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'consultoria_it',
    'Servicios profesionales de analisis de datos',
    'SERVICIOS_PROFESIONALES',
    FALSE,
    'CLIENTES_EMPRESARIALES',
    FALSE,
    TRUE,
    FALSE,
    FALSE,
    360000.00,
    30000.00,
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    'GRAVADO_16',
    TRUE,
    TRUE
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'tienda_marketplace',
    'Ventas ocasionales mediante marketplace',
    'PLATAFORMAS',
    FALSE,
    'PLATAFORMA_DIGITAL',
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    180000.00,
    15000.00,
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    'GRAVADO_16',
    FALSE,
    TRUE
  ),
  (
    '88888888-8888-4888-8888-888888888888',
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'departamento_narvarte',
    'Renta de departamento habitacional',
    'ARRENDAMIENTO',
    FALSE,
    'PERSONA_FISICA',
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    420000.00,
    35000.00,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    'EXENTO',
    FALSE,
    FALSE
  );

INSERT INTO regime_identification_results (
  id,
  session_id,
  income_source_id,
  base_classification,
  categoria_fiscal,
  periodicidad_isr,
  periodicidad_iva,
  requiere_declaracion_anual,
  eligible_for_resico,
  resico_assigned,
  motivo_deteccion,
  has_sat_inconsistency,
  requires_sat_update_notice
) VALUES
  (
    '99999999-9999-4999-8999-999999999999',
    '33333333-3333-4333-8333-333333333333',
    '55555555-5555-4555-8555-555555555555',
    'SUELDOS_Y_SALARIOS',
    'SUELDOS_Y_SALARIOS',
    'RETENCION_NOMINA',
    'NO_APLICA',
    TRUE,
    FALSE,
    FALSE,
    'Fuente con CFDI de nomina y relacion subordinada.',
    FALSE,
    FALSE
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    '66666666-6666-4666-8666-666666666666',
    'SERVICIOS_PROFESIONALES',
    'SERVICIOS_PROFESIONALES_RESICO',
    'MENSUAL',
    'MENSUAL',
    TRUE,
    TRUE,
    TRUE,
    'Prestacion independiente con preferencia expresa por RESICO.',
    FALSE,
    FALSE
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '33333333-3333-4333-8333-333333333333',
    '77777777-7777-4777-8777-777777777777',
    'PLATAFORMAS_TECNOLOGICAS',
    'REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS',
    'POR_DETERMINAR',
    'POR_DETERMINAR',
    TRUE,
    FALSE,
    FALSE,
    'La fuente usa plataforma tecnologica y requiere modulo especializado.',
    TRUE,
    TRUE
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '44444444-4444-4444-8444-444444444444',
    '88888888-8888-4888-8888-888888888888',
    'ARRENDAMIENTO',
    'ARRENDAMIENTO_REGIMEN_GENERAL',
    'MENSUAL',
    'NO_APLICA',
    TRUE,
    TRUE,
    FALSE,
    'Ingreso por uso o goce temporal de inmueble sin opcion RESICO activada.',
    FALSE,
    FALSE
  );

INSERT INTO regime_session_summary (
  id,
  session_id,
  total_obligaciones,
  tiene_multiples_obligaciones,
  tiene_resico,
  tiene_sueldos,
  tiene_actividad_cuenta_propia,
  estimated_self_employment_income_total,
  evaluated_at
) VALUES
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '33333333-3333-4333-8333-333333333333',
    3,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    540000.00,
    DATE '2026-02-14'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '44444444-4444-4444-8444-444444444444',
    1,
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    420000.00,
    DATE '2026-01-20'
  );


-- -----------------------------------------------------------------------------
-- H. GASTOS + EVALUACIONES DE DEDUCIBILIDAD
-- -----------------------------------------------------------------------------

INSERT INTO expenses (
  id,
  session_id,
  user_id,
  category,
  amount_mxn,
  has_cfdi,
  payment_method,
  invoice_receiver_rfc_matches_taxpayer,
  paid_from_taxpayer_account,
  paid_in_relevant_fiscal_year,
  beneficiary_relationship,
  provider_has_required_professional_license,
  school_level,
  has_official_school_recognition,
  school_transport_mandatory,
  invoice_separates_transport,
  disability_certificate,
  disability_percentage,
  donation_recipient_type,
  donation_is_onerous_or_remunerative,
  meets_retirement_permanence_requirement,
  interest_amount_is_real_interest,
  mortgage_credit_within_750k_udis,
  is_strictly_indispensable_for_activity,
  is_actually_paid,
  asset_type
) VALUES
  (
    'f1111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'PERSONAL_MEDICAL',
    12800.00,
    TRUE,
    'CREDIT_CARD',
    TRUE,
    TRUE,
    TRUE,
    'SELF',
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    NULL
  ),
  (
    'f2222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'BUSINESS_GENERAL_NECESSARY_EXPENSE',
    18450.00,
    TRUE,
    'TRANSFER',
    TRUE,
    TRUE,
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    TRUE,
    NULL
  ),
  (
    'f3333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'BUSINESS_INVESTMENT',
    36000.00,
    TRUE,
    'DEBIT_CARD',
    TRUE,
    TRUE,
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    TRUE,
    'COMPUTER_EQUIPMENT'
  ),
  (
    'f4444444-4444-4444-8444-444444444444',
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'ARR_MAINTENANCE_OR_WATER',
    5400.00,
    TRUE,
    'TRANSFER',
    TRUE,
    TRUE,
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    TRUE,
    NULL
  );

INSERT INTO expense_evaluation_results (
  id,
  expense_id,
  session_id,
  deductible_for_isr,
  deduction_kind,
  deductible_amount_mxn,
  deductible_percentage_over_expense,
  cap_applied_description,
  global_personal_cap_at_eval_mxn,
  consumed_global_cap_before_eval_mxn,
  generates_iva_acreditable,
  estimated_iva_acreditable_mxn
) VALUES
  (
    '12121212-1212-4212-8212-121212121212',
    'f1111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    TRUE,
    'PERSONAL_ANNUAL',
    12800.00,
    1.000000,
    'Deduccion personal dentro del tope global anual.',
    189000.00,
    0.00,
    FALSE,
    0.00
  ),
  (
    '23232323-2323-4232-8232-232323232323',
    'f2222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    TRUE,
    'BUSINESS_CURRENT_PERIOD_ISR',
    18450.00,
    1.000000,
    'Gasto estrictamente indispensable y efectivamente pagado.',
    NULL,
    NULL,
    TRUE,
    2551.72
  ),
  (
    '34343434-3434-4343-8343-343434343434',
    'f3333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333333',
    TRUE,
    'BUSINESS_ANNUAL_INVESTMENT_ISR',
    10800.00,
    0.300000,
    'Se aplico tasa anual de 30% para equipo de computo.',
    NULL,
    NULL,
    TRUE,
    4965.52
  ),
  (
    '45454545-4545-4454-8454-454545454545',
    'f4444444-4444-4444-8444-444444444444',
    '44444444-4444-4444-8444-444444444444',
    TRUE,
    'ARR_CURRENT_PERIOD_ISR',
    5400.00,
    1.000000,
    'Gasto relacionado con mantenimiento del inmueble arrendado.',
    NULL,
    NULL,
    FALSE,
    0.00
  );

INSERT INTO deductions_accumulator_snapshots (
  id,
  session_id,
  total_personal_deductibles_mxn,
  total_activity_deductibles_mxn,
  total_iva_acreditable_mxn,
  approved_count,
  rejected_count,
  details_data,
  last_recalculated_at
) VALUES
  (
    '56565656-5656-4565-8565-565656565656',
    '33333333-3333-4333-8333-333333333333',
    12800.00,
    29250.00,
    7517.24,
    3,
    0,
    '{
      "totalDeductiblesMxn": 42050.00,
      "approvedExpenses": [
        "12121212-1212-4212-8212-121212121212",
        "23232323-2323-4232-8232-232323232323",
        "34343434-3434-4343-8343-343434343434"
      ],
      "rejectedExpenses": []
    }'::jsonb,
    TIMESTAMPTZ '2026-02-14 16:10:00+00'
  ),
  (
    '67676767-6767-4676-8676-676767676767',
    '44444444-4444-4444-8444-444444444444',
    0.00,
    5400.00,
    0.00,
    1,
    0,
    '{
      "totalDeductiblesMxn": 5400.00,
      "approvedExpenses": [
        "45454545-4545-4454-8454-454545454545"
      ],
      "rejectedExpenses": []
    }'::jsonb,
    TIMESTAMPTZ '2026-01-20 11:30:00+00'
  );


-- -----------------------------------------------------------------------------
-- I. RESULTADOS DE BUFFER + TRAZABILIDAD DE MENSAJES
-- -----------------------------------------------------------------------------

INSERT INTO tax_buffer_results (
  id,
  session_id,
  recommended_monthly_buffer,
  estimated_iva_causado,
  estimated_iva_acreditable,
  estimated_iva_owed,
  total_tax_liability,
  total_with_safety_margin,
  remaining_after_credits,
  buffer_horizon_months,
  safety_margin_applied,
  isr_by_obligation,
  taxable_base_by_obligation,
  result_data
) VALUES
  (
    '78787878-7878-4787-8787-787878787878',
    '33333333-3333-4333-8333-333333333333',
    9750.00,
    57600.00,
    7517.24,
    37582.76,
    116800.00,
    134320.00,
    29250.00,
    3,
    1.1500,
    '{"SUELDOS_Y_SALARIOS": 84500.00, "SERVICIOS_PROFESIONALES_RESICO": 4320.00, "REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS": 27980.00}'::jsonb,
    '{"SUELDOS_Y_SALARIOS": 720000.00, "SERVICIOS_PROFESIONALES_RESICO": 360000.00, "REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS": 180000.00}'::jsonb,
    '{
      "recommendedMonthlyBuffer": 9750.00,
      "estimatedIVACausado": 57600.00,
      "estimatedIVAAcreditable": 7517.24,
      "estimatedIVAOwed": 37582.76,
      "totalTaxLiability": 116800.00,
      "totalWithSafetyMargin": 134320.00,
      "remainingTaxAfterCredits": 29250.00,
      "bufferHorizonMonths": 3,
      "safetyMarginApplied": 1.15,
      "estimatedISRByObligation": {
        "SUELDOS_Y_SALARIOS": 84500.00,
        "SERVICIOS_PROFESIONALES_RESICO": 4320.00,
        "REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS": 27980.00
      },
      "taxableBaseByObligation": {
        "SUELDOS_Y_SALARIOS": 720000.00,
        "SERVICIOS_PROFESIONALES_RESICO": 360000.00,
        "REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS": 180000.00
      }
    }'::jsonb
  ),
  (
    '89898989-8989-4898-8898-898989898989',
    '44444444-4444-4444-8444-444444444444',
    3150.00,
    0.00,
    0.00,
    0.00,
    64200.00,
    73830.00,
    63000.00,
    2,
    1.1500,
    '{"ARRENDAMIENTO_REGIMEN_GENERAL": 64200.00}'::jsonb,
    '{"ARRENDAMIENTO_REGIMEN_GENERAL": 414600.00}'::jsonb,
    '{
      "recommendedMonthlyBuffer": 3150.00,
      "estimatedIVACausado": 0.00,
      "estimatedIVAAcreditable": 0.00,
      "estimatedIVAOwed": 0.00,
      "totalTaxLiability": 64200.00,
      "totalWithSafetyMargin": 73830.00,
      "remainingTaxAfterCredits": 63000.00,
      "bufferHorizonMonths": 2,
      "safetyMarginApplied": 1.15,
      "estimatedISRByObligation": {
        "ARRENDAMIENTO_REGIMEN_GENERAL": 64200.00
      },
      "taxableBaseByObligation": {
        "ARRENDAMIENTO_REGIMEN_GENERAL": 414600.00
      }
    }'::jsonb
  );

INSERT INTO calculation_messages (
  session_id,
  expense_eval_id,
  regime_result_id,
  buffer_result_id,
  regime_summary_id,
  message_type,
  sort_order,
  message_text
) VALUES
  (
    '33333333-3333-4333-8333-333333333333',
    NULL,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    NULL,
    NULL,
    'OFFICIAL_NOTE',
    1,
    'La fuente de consultoria se clasifico en RESICO por preferencia expresa y elegibilidad vigente.'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    NULL,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    NULL,
    NULL,
    'INCONSISTENCY',
    1,
    'La fuente operada mediante plataforma requiere revision especializada antes de confirmar obligaciones finales.'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '23232323-2323-4232-8232-232323232323',
    NULL,
    NULL,
    NULL,
    'REASON',
    1,
    'El gasto fue aceptado porque cuenta con CFDI, pago bancarizado y relacion directa con la actividad.'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '34343434-3434-4343-8343-343434343434',
    NULL,
    NULL,
    NULL,
    'WARNING',
    1,
    'La inversion se deduce de forma anual; el monto mensual disponible no equivale al total pagado.'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    NULL,
    NULL,
    NULL,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'NEXT_STEP',
    1,
    'Conviene validar ante SAT la fuente de marketplace para separar retenciones de plataformas del resto del perfil.'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    NULL,
    NULL,
    '78787878-7878-4787-8787-787878787878',
    NULL,
    'REASONING_STEP',
    1,
    'Se sumaron ISR estimado, IVA neto y el margen de seguridad dominante de las obligaciones detectadas.'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    NULL,
    NULL,
    '78787878-7878-4787-8787-787878787878',
    NULL,
    'REASONING_STEP',
    2,
    'El resultado anual remanente se prorrateo a tres meses por la configuracion de buffer_horizon_months.'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    NULL,
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    NULL,
    NULL,
    'OFFICIAL_NOTE',
    1,
    'El arrendamiento se mantiene en regimen general porque no se activo asignacion automatica a RESICO.'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '45454545-4545-4454-8454-454545454545',
    NULL,
    NULL,
    NULL,
    'REASON',
    1,
    'El mantenimiento del inmueble fue aceptado como deduccion corriente del periodo.'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    NULL,
    NULL,
    '89898989-8989-4898-8898-898989898989',
    NULL,
    'REASONING_STEP',
    1,
    'El buffer considera solo ISR por arrendamiento porque la fuente fue marcada como exenta de IVA.'
  );

COMMIT;
