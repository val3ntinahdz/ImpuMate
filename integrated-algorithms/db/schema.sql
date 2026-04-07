-- =============================================================================
-- ImpuMate — schema.sql
-- PostgreSQL 15+
-- =============================================================================
--
-- ORDEN DE CREACIÓN (topológico, sin dependencias rotas):
--   1. ENUM types
--   2. Tablas de parámetros fiscales (sin FK a usuario)
--   3. Tabla de usuarios
--   4. Tablas de sesión fiscal
--   5. Fuentes de ingreso + obligaciones detectadas
--   6. Gastos + resultados de evaluación
--   7. Resultado del buffer
--   8. Tablas hijas de arrays (reasons, warnings, reasoning steps)
--
-- CONVENCIONES:
--   - UUID como PK en todas las entidades de usuario (gen_random_uuid())
--   - SERIAL como PK en tablas de catálogo / parámetros fiscales
--   - snake_case en todos los identificadores
--   - created_at / updated_at en todas las tablas transaccionales
--   - Índices en FKs de alta cardinalidad y columnas de filtro frecuente
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONES
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provee gen_random_uuid()


-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================
-- Decisión de diseño: se usan PostgreSQL ENUM types (no tablas de catálogo)
-- para los dominios que:
--   a) están completamente controlados por el código de la app,
--   b) raramente cambian entre versiones, y
--   c) se benefician de la validación a nivel de motor sin JOIN adicional.
--
-- Se usan tablas de catálogo (no ENUMs) para los parámetros fiscales
-- (tarifas, tasas, márgenes) porque varían por ejercicio_fiscal y
-- necesitan versionado sin ALTER TYPE.
-- =============================================================================

-- Obligaciones fiscales finales (output de taxRegimeIdentifier,
-- input de expenseDeductionAdvisor y taxBufferCalculator)
CREATE TYPE obligation_category_enum AS ENUM (
  'SUELDOS_Y_SALARIOS',
  'ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL',
  'SERVICIOS_PROFESIONALES_REGIMEN_GENERAL',
  'ARRENDAMIENTO_REGIMEN_GENERAL',
  'ACTIVIDAD_EMPRESARIAL_RESICO',
  'SERVICIOS_PROFESIONALES_RESICO',
  'ARRENDAMIENTO_RESICO',
  'REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS',
  'NO_DETERMINADA'
);

-- Clasificación económica intermedia (uso interno de taxRegimeIdentifier)
CREATE TYPE base_classification_enum AS ENUM (
  'SUELDOS_Y_SALARIOS',
  'ACTIVIDAD_EMPRESARIAL',
  'SERVICIOS_PROFESIONALES',
  'ARRENDAMIENTO',
  'PLATAFORMAS_TECNOLOGICAS',
  'NO_CLASIFICADA'
);

-- Categorías de gasto (input de expenseDeductionAdvisor)
CREATE TYPE expense_category_enum AS ENUM (
  -- Deducciones personales
  'PERSONAL_MEDICAL',
  'PERSONAL_MEDICAL_DISABILITY',
  'PERSONAL_OPTICAL_LENSES',
  'PERSONAL_MEDICAL_INSURANCE',
  'PERSONAL_TUITION',
  'PERSONAL_SCHOOL_TRANSPORT',
  'PERSONAL_FUNERAL',
  'PERSONAL_DONATION',
  'PERSONAL_RETIREMENT_CONTRIBUTION',
  'PERSONAL_MORTGAGE_REAL_INTEREST',
  -- Actividad empresarial / servicios profesionales
  'BUSINESS_INVENTORY_OR_RAW_MATERIALS',
  'BUSINESS_GENERAL_NECESSARY_EXPENSE',
  'BUSINESS_OFFICE_RENT',
  'BUSINESS_UTILITIES',
  'BUSINESS_PHONE_INTERNET',
  'BUSINESS_INTEREST',
  'BUSINESS_IMSS',
  'BUSINESS_LOCAL_TAX',
  'BUSINESS_INVESTMENT',
  -- Arrendamiento
  'ARR_PROPERTY_TAX',
  'ARR_MAINTENANCE_OR_WATER',
  'ARR_REAL_INTEREST',
  'ARR_SALARIES_FEES_TAXES',
  'ARR_INSURANCE',
  'ARR_CONSTRUCTION_INVESTMENT'
);

-- Tipo de deducción resultante (output de expenseDeductionAdvisor)
CREATE TYPE deduction_kind_enum AS ENUM (
  'NOT_DEDUCTIBLE',
  'PERSONAL_ANNUAL',
  'BUSINESS_CURRENT_PERIOD_ISR',
  'BUSINESS_ANNUAL_INVESTMENT_ISR',
  'ARR_CURRENT_PERIOD_ISR',
  'ARR_ANNUAL_INVESTMENT_ISR',
  'ARR_OPTIONAL_35_ISR'
);

-- Método de pago del gasto
CREATE TYPE payment_method_enum AS ENUM (
  'CASH',
  'TRANSFER',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'SERVICE_CARD',
  'NOMINATIVE_CHECK'
);

-- Tratamiento de IVA de una fuente de ingreso
CREATE TYPE iva_treatment_enum AS ENUM (
  'GRAVADO_16',
  'EXENTO',
  'TASA_CERO',
  'NO_APLICA',
  'POR_DETERMINAR'
);

-- Periodicidad de declaración
CREATE TYPE periodicity_enum AS ENUM (
  'RETENCION_NOMINA',
  'MENSUAL',
  'BIMESTRAL',
  'ANUAL',
  'NO_APLICA',
  'POR_DETERMINAR',
  'NO_DETERMINADA'
);

-- Estado de cumplimiento SAT del contribuyente
CREATE TYPE sat_compliance_enum AS ENUM (
  'AL_CORRIENTE',
  'INCUMPLIMIENTO',
  'EN_REVISION',
  'DESCONOCIDO'
);

-- Tipo de mensaje en arrays de salida (reasons, warnings, etc.)
CREATE TYPE message_type_enum AS ENUM (
  'REASON',         -- por qué un gasto fue rechazado
  'WARNING',        -- advertencia no bloqueante
  'MISSING_DATA',   -- dato faltante para mayor precisión
  'OFFICIAL_NOTE',  -- referencia a fuente oficial
  'INCONSISTENCY',  -- alerta de inconsistencia SAT
  'NEXT_STEP',      -- paso operativo recomendado
  'REASONING_STEP'  -- paso del razonamiento del buffer (ordenado)
);


-- =============================================================================
-- 2. PARÁMETROS FISCALES (tablas de catálogo, sin FK a usuario)
-- =============================================================================

-- Parámetros generales por ejercicio fiscal
-- (UMA, IVA rate, límite RESICO, umbral bancarización)
CREATE TABLE fiscal_parameters (
  id                            SERIAL PRIMARY KEY,
  exercise_year                 SMALLINT        NOT NULL,
  annual_uma_value_mxn          NUMERIC(12, 2)  NOT NULL,
  general_iva_rate              NUMERIC(5, 4)   NOT NULL,
  resico_annual_income_limit_mxn NUMERIC(14, 2) NOT NULL,
  banked_payment_threshold_mxn  NUMERIC(10, 2)  NOT NULL,
  -- Topes globales de deducciones personales
  personal_deductions_uma_multiplier    SMALLINT        NOT NULL DEFAULT 5,
  personal_deductions_income_pct        NUMERIC(5, 4)   NOT NULL DEFAULT 0.15,
  -- Topes específicos
  optical_lenses_cap_mxn        NUMERIC(10, 2)  NOT NULL,
  funeral_cap_uma_multiplier    SMALLINT        NOT NULL DEFAULT 1,
  mortgage_credit_udi_limit     NUMERIC(12, 2)  NOT NULL,
  donation_cap_general_pct      NUMERIC(5, 4)   NOT NULL,
  donation_cap_government_pct   NUMERIC(5, 4)   NOT NULL,
  retirement_cap_income_pct     NUMERIC(5, 4)   NOT NULL,
  retirement_cap_uma_multiplier SMALLINT        NOT NULL DEFAULT 5,
  -- Tasas de deducción de inversiones (negocio)
  inv_rate_construction_business        NUMERIC(5, 4)   NOT NULL,
  inv_rate_installation_business        NUMERIC(5, 4)   NOT NULL,
  inv_rate_office_furniture             NUMERIC(5, 4)   NOT NULL,
  inv_rate_computer_equipment_business  NUMERIC(5, 4)   NOT NULL,
  inv_rate_automobile                   NUMERIC(5, 4)   NOT NULL,
  -- Tasas de deducción de inversiones (arrendamiento)
  inv_rate_construction_rental          NUMERIC(5, 4)   NOT NULL,
  inv_rate_installation_rental          NUMERIC(5, 4)   NOT NULL,
  inv_rate_computer_equipment_rental    NUMERIC(5, 4)   NOT NULL,
  inv_rate_other_tangible_rental        NUMERIC(5, 4)   NOT NULL,
  -- Topes de colegiaturas por nivel (MXN)
  tuition_cap_preescolar        NUMERIC(10, 2)  NOT NULL,
  tuition_cap_primaria          NUMERIC(10, 2)  NOT NULL,
  tuition_cap_secundaria        NUMERIC(10, 2)  NOT NULL,
  tuition_cap_profesional_tecnico NUMERIC(10, 2) NOT NULL,
  tuition_cap_bachillerato      NUMERIC(10, 2)  NOT NULL,

  UNIQUE (exercise_year)
);

-- Tarifa anual ISR (art. 152 LISR) — 11 tramos por ejercicio
-- Mecánica: ISR = fixed_fee + (base − lower_bound) × marginal_rate
CREATE TABLE isr_annual_tariff_brackets (
  id              SERIAL PRIMARY KEY,
  exercise_year   SMALLINT        NOT NULL,
  bracket_order   SMALLINT        NOT NULL,   -- 1-11, para ordenar al aplicar
  lower_bound_mxn NUMERIC(16, 2)  NOT NULL,
  upper_bound_mxn NUMERIC(16, 2),             -- NULL = sin límite (último tramo)
  fixed_fee_mxn   NUMERIC(14, 2)  NOT NULL,
  marginal_rate   NUMERIC(7, 6)   NOT NULL,

  UNIQUE (exercise_year, bracket_order),
  CONSTRAINT isr_bracket_bounds CHECK (
    upper_bound_mxn IS NULL OR upper_bound_mxn > lower_bound_mxn
  )
);

-- Tasas ISR RESICO (art. 113-E LISR) — 5 tramos por ejercicio
-- Mecánica: tasa plana sobre TOTAL de ingresos (NO marginal)
CREATE TABLE resico_isr_rate_brackets (
  id              SERIAL PRIMARY KEY,
  exercise_year   SMALLINT        NOT NULL,
  bracket_order   SMALLINT        NOT NULL,   -- 1-5
  upper_bound_mxn NUMERIC(14, 2),             -- NULL = sin límite (último tramo)
  rate            NUMERIC(7, 6)   NOT NULL,

  UNIQUE (exercise_year, bracket_order)
);

-- Márgenes de seguridad del buffer por obligación y ejercicio
-- (son parámetros de producto, no de ley — pueden ajustarse)
CREATE TABLE buffer_safety_margins (
  id                  SERIAL PRIMARY KEY,
  exercise_year       SMALLINT                NOT NULL,
  obligation_category obligation_category_enum NOT NULL,
  margin_multiplier   NUMERIC(5, 4)           NOT NULL,

  UNIQUE (exercise_year, obligation_category),
  CONSTRAINT margin_above_one CHECK (margin_multiplier >= 1.0)
);


-- =============================================================================
-- 3. USUARIOS
-- =============================================================================

CREATE TABLE users (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Datos de autenticación (mínimos; auth puede vivir en servicio separado)
  email                 TEXT            NOT NULL UNIQUE,
  password_hash         TEXT            NOT NULL,
  -- Datos fiscales del perfil SAT
  rfc                   CHAR(13)        UNIQUE,   -- NULL hasta que el usuario lo registre
  nombre_completo       TEXT,
  -- Flags fiscales del contribuyente
  es_socio_accionista                           BOOLEAN NOT NULL DEFAULT FALSE,
  es_residente_extranjero_con_ep                BOOLEAN NOT NULL DEFAULT FALSE,
  percibe_ingresos_regimen_preferente           BOOLEAN NOT NULL DEFAULT FALSE,
  prefiere_resico_en_fuentes_elegibles          BOOLEAN NOT NULL DEFAULT FALSE,
  uses_blind_rental_deduction                   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Estado SAT
  estado_cumplimiento_sat   sat_compliance_enum NOT NULL DEFAULT 'DESCONOCIDO',
  -- Arrays SAT: se normalizan en tablas hijas porque pueden cambiar y
  -- necesitan historial. Ver: user_sat_regimes, user_sat_obligations
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Regímenes registrados en SAT por el usuario (array normalizado)
CREATE TABLE user_sat_regimes (
  id          SERIAL      PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  regime_code TEXT        NOT NULL,   -- ej. 'SUELDOS_Y_SALARIOS', 'RESICO_PERSONAS_FISICAS'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, regime_code)
);

-- Obligaciones registradas en SAT por el usuario (array normalizado)
CREATE TABLE user_sat_obligations (
  id               SERIAL      PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  obligation_code  TEXT        NOT NULL,   -- ej. 'ISR_SUELDOS', 'IVA_MENSUAL'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, obligation_code)
);


-- =============================================================================
-- 4. SESIONES DE CÁLCULO FISCAL
-- =============================================================================
-- Una sesión agrupa todas las evaluaciones de un usuario para un período
-- específico. Es el contenedor que une las tres features:
--   regime_identification → expense_evaluations → buffer_result

CREATE TABLE fiscal_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_year   SMALLINT    NOT NULL,
  -- Estado de la sesión
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Snapshot del contexto anual al momento del cálculo
  -- (evita recalcular si los parámetros fiscales cambian)
  annual_total_income_mxn                   NUMERIC(16, 2),
  current_year_accum_income_retirement_mxn  NUMERIC(16, 2),
  prev_year_accum_income_donation_mxn       NUMERIC(16, 2),
  -- Cache JSONB del resultado agregado de identificación de régimen.
  -- Lo usa la API legacy para persistir el output completo sin reconstruirlo.
  regime_result_data                        JSONB,
  isr_already_withheld_by_salary_mxn        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  iva_already_paid_to_sat_mxn               NUMERIC(14, 2) NOT NULL DEFAULT 0,
  buffer_horizon_months                     SMALLINT       NOT NULL DEFAULT 1
    CONSTRAINT valid_horizon CHECK (buffer_horizon_months BETWEEN 1 AND 12),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, exercise_year)   -- un período activo por usuario por año
);


-- =============================================================================
-- 5. FUENTES DE INGRESO + OBLIGACIONES DETECTADAS
-- (taxRegimeIdentifier)
-- =============================================================================

-- Fuentes de ingreso declaradas por el usuario
-- (input principal de taxRegimeIdentifier)
CREATE TABLE income_sources (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Identificador libre del usuario
  source_key          TEXT        NOT NULL,   -- equivale a idFuente
  description         TEXT,
  -- Clasificación económica declarada por el usuario.
  -- Es opcional: la clasificación fiscal se deriva principalmente de los flags.
  declared_economic_type          TEXT,                   -- tipoEconomicoDeclaradoPorUsuario
  -- Naturaleza económica real (flags)
  existe_relacion_subordinada     BOOLEAN     NOT NULL DEFAULT FALSE,
  quien_paga                      TEXT        NOT NULL,
  vende_bienes                    BOOLEAN     NOT NULL DEFAULT FALSE,
  presta_servicios_independientes BOOLEAN     NOT NULL DEFAULT FALSE,
  otorga_uso_goce_temporal_inmueble BOOLEAN   NOT NULL DEFAULT FALSE,
  usa_plataforma_tecnologica      BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Montos estimados
  monto_anual_estimado_sin_iva    NUMERIC(16, 2) NOT NULL DEFAULT 0,
  monto_mensual_promedio_sin_iva  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  -- CFDI y retenciones
  emite_cfdi                      BOOLEAN     NOT NULL DEFAULT FALSE,
  recibe_cfdi_nomina              BOOLEAN     NOT NULL DEFAULT FALSE,
  cliente_retiene_isr             BOOLEAN     NOT NULL DEFAULT FALSE,
  cliente_retiene_iva             BOOLEAN     NOT NULL DEFAULT FALSE,
  tratamiento_iva_esperado        iva_treatment_enum NOT NULL DEFAULT 'POR_DETERMINAR',
  -- Preferencia RESICO explícita del usuario para esta fuente
  solicita_tributar_en_resico     BOOLEAN     NOT NULL DEFAULT FALSE,
  -- ¿Esta fuente causa IVA? (usado por taxBufferCalculator)
  is_subject_to_iva               BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id, source_key)
);

-- Resultado de la identificación de régimen para cada fuente de ingreso
-- (output de taxRegimeIdentifier, una fila por income_source)
CREATE TABLE regime_identification_results (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID        NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  income_source_id        UUID        NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  -- Clasificación económica intermedia detectada por el algoritmo
  base_classification     base_classification_enum NOT NULL,
  -- Obligación fiscal final asignada
  categoria_fiscal        obligation_category_enum NOT NULL,
  -- Atributos de la obligación
  periodicidad_isr        periodicity_enum         NOT NULL DEFAULT 'NO_DETERMINADA',
  periodicidad_iva        periodicity_enum         NOT NULL DEFAULT 'NO_DETERMINADA',
  requiere_declaracion_anual  BOOLEAN              NOT NULL DEFAULT FALSE,
  -- Elegibilidad y asignación RESICO (para auditoría)
  eligible_for_resico     BOOLEAN     NOT NULL DEFAULT FALSE,
  resico_assigned         BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Motivo de detección (texto del algoritmo)
  motivo_deteccion        TEXT,
  -- ¿Hay inconsistencia con el SAT?
  has_sat_inconsistency   BOOLEAN     NOT NULL DEFAULT FALSE,
  -- ¿Requiere aviso de actualización al SAT?
  requires_sat_update_notice BOOLEAN  NOT NULL DEFAULT FALSE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (income_source_id)   -- una identificación por fuente
);

-- Resumen ejecutivo de la identificación completa de la sesión
-- (output de buildExecutiveSummary — una fila por sesión)
CREATE TABLE regime_session_summary (
  id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                  UUID    NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  total_obligaciones          SMALLINT NOT NULL DEFAULT 0,
  tiene_multiples_obligaciones BOOLEAN NOT NULL DEFAULT FALSE,
  tiene_resico                BOOLEAN NOT NULL DEFAULT FALSE,
  tiene_sueldos               BOOLEAN NOT NULL DEFAULT FALSE,
  tiene_actividad_cuenta_propia BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_self_employment_income_total NUMERIC(16, 2) NOT NULL DEFAULT 0,
  evaluated_at                DATE    NOT NULL,

  UNIQUE (session_id)
);


-- =============================================================================
-- 6. GASTOS + EVALUACIONES DE DEDUCIBILIDAD
-- (expenseDeductionAdvisor + deductionsAccumulator)
-- =============================================================================

-- Gastos registrados por el usuario
CREATE TABLE expenses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Clasificación
  category            expense_category_enum NOT NULL,
  amount_mxn          NUMERIC(14, 2) NOT NULL CHECK (amount_mxn >= 0),
  -- Requisitos formales
  has_cfdi                                  BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method                            payment_method_enum,
  invoice_receiver_rfc_matches_taxpayer     BOOLEAN NOT NULL DEFAULT FALSE,
  paid_from_taxpayer_account                BOOLEAN NOT NULL DEFAULT FALSE,
  paid_in_relevant_fiscal_year              BOOLEAN NOT NULL DEFAULT FALSE,
  -- Campos contextuales (algunos son NULL según la categoría)
  beneficiary_relationship                  TEXT,
  provider_has_required_professional_license BOOLEAN,
  school_level                              TEXT,
  has_official_school_recognition           BOOLEAN,
  school_transport_mandatory                BOOLEAN,
  invoice_separates_transport               BOOLEAN,
  disability_certificate                    BOOLEAN,
  disability_percentage                     NUMERIC(5, 2),
  donation_recipient_type                   TEXT,
  donation_is_onerous_or_remunerative       BOOLEAN,
  meets_retirement_permanence_requirement   BOOLEAN,
  interest_amount_is_real_interest          BOOLEAN,
  mortgage_credit_within_750k_udis          BOOLEAN,
  is_strictly_indispensable_for_activity    BOOLEAN,
  is_actually_paid                          BOOLEAN,
  asset_type                                TEXT,   -- COMPUTER_EQUIPMENT, CONSTRUCTION, etc.

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resultado de la evaluación de deducibilidad de cada gasto
-- (output de evaluateExpenseDeductibility — una fila por expense)
CREATE TABLE expense_evaluation_results (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id                      UUID        NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  session_id                      UUID        NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  -- Resultado principal
  deductible_for_isr              BOOLEAN     NOT NULL DEFAULT FALSE,
  deduction_kind                  deduction_kind_enum NOT NULL DEFAULT 'NOT_DEDUCTIBLE',
  deductible_amount_mxn           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deductible_percentage_over_expense NUMERIC(7, 6) NOT NULL DEFAULT 0,
  cap_applied_description         TEXT,
  -- Estado del tope global al momento de la evaluación (snapshot)
  -- Permite reconstruir por qué un gasto fue limitado o rechazado
  global_personal_cap_at_eval_mxn     NUMERIC(14, 2),
  consumed_global_cap_before_eval_mxn NUMERIC(14, 2),
  -- ¿Genera IVA acreditable esta evaluación?
  generates_iva_acreditable       BOOLEAN     NOT NULL DEFAULT FALSE,
  estimated_iva_acreditable_mxn   NUMERIC(14, 2) NOT NULL DEFAULT 0,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (expense_id)
);

-- Estado acumulado del acumulador de deducciones (snapshot por sesión)
-- Permite al buffer calculator leer los totales sin recalcular
CREATE TABLE deductions_accumulator_snapshots (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                      UUID        NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  -- Totales acumulados
  total_personal_deductibles_mxn  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_activity_deductibles_mxn  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_iva_acreditable_mxn       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  -- Contadores
  approved_count                  SMALLINT    NOT NULL DEFAULT 0,
  rejected_count                  SMALLINT    NOT NULL DEFAULT 0,
  -- Detalle serializado del acumulador para respuesta directa de la API.
  details_data                    JSONB       NOT NULL DEFAULT '{}',
  -- Timestamp del último recalculo
  last_recalculated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id)
);


-- =============================================================================
-- 7. RESULTADO DEL BUFFER
-- (taxBufferCalculator)
-- =============================================================================

CREATE TABLE tax_buffer_results (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                  UUID        NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  -- El número que ve el usuario
  recommended_monthly_buffer  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  -- Desglose ISR e IVA
  estimated_iva_causado        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estimated_iva_acreditable    NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estimated_iva_owed           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_tax_liability          NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_with_safety_margin     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  remaining_after_credits      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  -- Parámetros del cálculo
  buffer_horizon_months        SMALLINT    NOT NULL,
  safety_margin_applied        NUMERIC(6, 4) NOT NULL DEFAULT 1,
  -- ISR por obligación (JSONB: { "SUELDOS_Y_SALARIOS": 32358.74, ... })
  -- Se usa JSONB aquí porque la estructura varía según las obligaciones del
  -- usuario y leer/escribir una tabla hija para 1-3 filas sería overhead
  -- desproporcionado. El índice GIN facilita queries de análisis.
  isr_by_obligation            JSONB       NOT NULL DEFAULT '{}',
  taxable_base_by_obligation   JSONB       NOT NULL DEFAULT '{}',
  -- Cache serializado del resultado completo consumido por la API.
  result_data                  JSONB       NOT NULL DEFAULT '{}',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (session_id)   -- un resultado de buffer por sesión activa
);


-- =============================================================================
-- 8. TABLAS HIJAS — ARRAYS DE MENSAJES
-- =============================================================================
-- Decisión de diseño: todos los arrays de strings del sistema se normalizan
-- en una sola tabla polimórfica (calculation_messages) usando message_type_enum
-- para distinguir el origen.
--
-- Alternativa rechazada: TEXT[] en la tabla padre.
-- Razón del rechazo: los arrays de strings son la principal fuente de
-- trazabilidad del sistema. Necesitan ser filtrables por tipo, ordenables
-- (reasoning steps tienen un orden explícito), y potencialmente traducibles
-- en versiones futuras. TEXT[] haría eso imposible sin refactoring de schema.
--
-- La tabla es polimórfica en el sentido de que puede apuntar a expenses,
-- income_sources, o tax_buffer_results mediante columnas nullable de FK.
-- Se eligió este patrón sobre múltiples tablas hijas para evitar JOIN
-- combinatorios en la API al construir el detalle de una sesión.
-- =============================================================================

CREATE TABLE calculation_messages (
  id                  SERIAL      PRIMARY KEY,
  -- Contexto de la sesión siempre presente
  session_id          UUID        NOT NULL REFERENCES fiscal_sessions(id) ON DELETE CASCADE,
  -- Referencia a la entidad específica (solo una será NOT NULL por fila)
  expense_eval_id     UUID        REFERENCES expense_evaluation_results(id) ON DELETE CASCADE,
  regime_result_id    UUID        REFERENCES regime_identification_results(id) ON DELETE CASCADE,
  buffer_result_id    UUID        REFERENCES tax_buffer_results(id) ON DELETE CASCADE,
  regime_summary_id   UUID        REFERENCES regime_session_summary(id) ON DELETE CASCADE,
  -- Clasificación del mensaje
  message_type        message_type_enum NOT NULL,
  -- Orden dentro del mismo contexto (crítico para REASONING_STEP del buffer)
  sort_order          SMALLINT    NOT NULL DEFAULT 0,
  -- Contenido
  message_text        TEXT        NOT NULL,

  CONSTRAINT calculation_messages_single_parent CHECK (
    (
      (expense_eval_id   IS NOT NULL)::INT +
      (regime_result_id  IS NOT NULL)::INT +
      (buffer_result_id  IS NOT NULL)::INT +
      (regime_summary_id IS NOT NULL)::INT
    ) = 1
  )
);


-- =============================================================================
-- ÍNDICES ESTRATÉGICOS
-- =============================================================================

-- Usuarios — búsqueda por RFC (frecuente en login/lookup)
CREATE INDEX idx_users_rfc ON users(rfc) WHERE rfc IS NOT NULL;

-- Sesiones — búsqueda por usuario y año
CREATE INDEX idx_fiscal_sessions_user_year ON fiscal_sessions(user_id, exercise_year);

-- Fuentes de ingreso — por sesión (carga de perfil del período)
CREATE INDEX idx_income_sources_session ON income_sources(session_id);
CREATE INDEX idx_income_sources_user    ON income_sources(user_id);

-- Resultados de régimen — por sesión y categoría (filtro frecuente en API)
CREATE INDEX idx_regime_results_session          ON regime_identification_results(session_id);
CREATE INDEX idx_regime_results_categoria_fiscal ON regime_identification_results(categoria_fiscal);

-- Gastos — por sesión, usuario y categoría
CREATE INDEX idx_expenses_session  ON expenses(session_id);
CREATE INDEX idx_expenses_user     ON expenses(user_id);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Evaluaciones de gastos — por sesión (para rebuild del acumulador)
CREATE INDEX idx_expense_eval_session ON expense_evaluation_results(session_id);

-- Buffer results — por sesión
CREATE INDEX idx_buffer_session ON tax_buffer_results(session_id);

-- Mensajes — por sesión, tipo y referencia (trazabilidad)
CREATE INDEX idx_calc_messages_session      ON calculation_messages(session_id);
CREATE INDEX idx_calc_messages_type         ON calculation_messages(message_type);
CREATE INDEX idx_calc_messages_expense_eval ON calculation_messages(expense_eval_id)
  WHERE expense_eval_id IS NOT NULL;
CREATE INDEX idx_calc_messages_buffer       ON calculation_messages(buffer_result_id)
  WHERE buffer_result_id IS NOT NULL;

-- Tarifas fiscales — por año (lookup al calcular)
CREATE INDEX idx_isr_brackets_year   ON isr_annual_tariff_brackets(exercise_year, bracket_order);
CREATE INDEX idx_resico_brackets_year ON resico_isr_rate_brackets(exercise_year, bracket_order);
CREATE INDEX idx_safety_margins_year  ON buffer_safety_margins(exercise_year, obligation_category);

-- JSONB en tax_buffer_results (análisis agregado)
CREATE INDEX idx_buffer_isr_by_obligation ON tax_buffer_results USING GIN (isr_by_obligation);
