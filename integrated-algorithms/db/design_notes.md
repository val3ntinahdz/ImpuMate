# ImpuMate — Notas de Diseño de Base de Datos

## A. Diagrama de entidades

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PARÁMETROS FISCALES (catálogo)                   │
│                                                                     │
│  fiscal_parameters (1 fila por año)                                 │
│  isr_annual_tariff_brackets (11 filas por año)                      │
│  resico_isr_rate_brackets (5 filas por año)                         │
│  buffer_safety_margins (8 filas por año)                            │
└─────────────────────────────────────────────────────────────────────┘
                            ▲ (exercise_year, sin FK directa)
                            │ el código las lee por año
                            │
┌──────────────┐     ┌──────┴──────────────┐
│    users     │────<│   fiscal_sessions   │
│  (UUID PK)   │     │  (UUID PK)          │
└──────┬───────┘     └──────────┬──────────┘
       │                        │
       │ 1:N                    │ 1:N (todas las tablas
  ┌────┴─────────────┐          │  hijas tienen session_id)
  │ user_sat_regimes │          │
  │ user_sat_         │         ├─────────────────────────────────────┐
  │   obligations    │          │                                     │
  └──────────────────┘          ▼                                     ▼
                        ┌───────────────┐               ┌────────────────────┐
                        │ income_sources│               │     expenses       │
                        │  (UUID PK)    │               │   (UUID PK)        │
                        └──────┬────────┘               └────────┬───────────┘
                               │ 1:1                             │ 1:1
                               ▼                                 ▼
                 ┌─────────────────────────┐   ┌─────────────────────────────┐
                 │ regime_identification_  │   │  expense_evaluation_results │
                 │      results            │   │  (deductible_for_isr,       │
                 │ (categoria_fiscal,      │   │   deduction_kind,           │
                 │  periodicidad,          │   │   deductible_amount_mxn,    │
                 │  has_sat_inconsistency) │   │   iva_acreditable)          │
                 └────────────────────────┘   └─────────────────────────────┘
                               │ 1:1
                               ▼
                 ┌─────────────────────────┐
                 │  regime_session_summary │
                 │  (tiene_resico,         │
                 │   tiene_sueldos, etc.)  │
                 └─────────────────────────┘

                 ┌──────────────────────────────┐
                 │ deductions_accumulator_      │◄─── se actualiza
                 │        snapshots             │     tras cada expense
                 │ (total_personal_mxn,         │     aprobado
                 │  total_activity_mxn,         │
                 │  total_iva_acreditable_mxn)  │
                 └──────────────────────────────┘
                               │
                               ▼ (alimenta al buffer)
                 ┌──────────────────────────────┐
                 │     tax_buffer_results       │
                 │ (recommended_monthly_buffer, │
                 │  isr_by_obligation JSONB,    │
                 │  taxable_base JSONB)         │
                 └──────────────────────────────┘

                 ┌──────────────────────────────┐
                 │    calculation_messages      │◄─── polimórfica:
                 │  (message_type_enum,         │     apunta a eval,
                 │   sort_order,                │     régimen, buffer
                 │   message_text)              │     o summary
                 └──────────────────────────────┘
```

---

## B. Las 3 decisiones de diseño más importantes

### 1. ENUM types vs. tablas de catálogo

Los dominios cerrados que controla el código (obligation_category, expense_category, deduction_kind, payment_method, etc.) son PostgreSQL ENUMs. La validación ocurre a nivel de motor sin JOIN adicional, y el contrato entre la API y la BD es explícito.

Los parámetros fiscales (tarifas ISR, tasas RESICO, márgenes de seguridad) son **tablas con columna `exercise_year`**, no ENUMs ni constantes hardcodeadas en la BD. Esta decisión es la más importante del esquema: cuando el SAT publique el Anexo 8 RMF 2027, se insertan nuevas filas sin tocar el schema ni el código. La API simplemente pasa el `exercise_year` como parámetro al consultar.

### 2. `calculation_messages` como tabla polimórfica

Los arrays de strings del sistema (reasons, warnings, reasoning_steps, inconsistency_alerts, next_steps) viven en una sola tabla con `message_type_enum` y `sort_order`. La alternativa — cinco tablas hijas separadas — habría multiplicado los JOINs necesarios para construir el detalle de una sesión en la API.

El `sort_order` es crítico para `REASONING_STEP`: el buffer produce pasos numerados que deben mostrarse en orden al usuario. TEXT[] haría eso imposible sin lógica adicional en la capa de aplicación.

La constraint `CHECK` garantiza que cada fila apunta a exactamente un padre (expense_eval, regime_result, buffer_result, o regime_summary).

### 3. JSONB para `isr_by_obligation` y `taxable_base_by_obligation`

El desglose de ISR y base gravable por obligación tiene entre 1 y 4 entradas dependiendo del perfil del usuario. Normalizar esto en una tabla hija agregaría una tabla extra con cardinalidad baja y un JOIN obligatorio en cada query de detalle del buffer.

JSONB con índice GIN permite queries de análisis agregado (`WHERE isr_by_obligation ? 'RESICO'`) sin sacrificar legibilidad. Es el único uso de JSONB en el schema — el resto está completamente normalizado.

---

## C. Cómo el esquema facilita la API Express

Cada tabla mapea directamente a un recurso o subrecurso REST:

| Recurso REST | Tabla(s) principal(es) |
|---|---|
| `POST /auth/register` | `users` |
| `GET /users/:id/profile` | `users` + `user_sat_regimes` + `user_sat_obligations` |
| `POST /sessions` | `fiscal_sessions` |
| `POST /sessions/:id/income-sources` | `income_sources` |
| `POST /sessions/:id/income-sources/:sid/identify` | `regime_identification_results` + `regime_session_summary` + `calculation_messages` |
| `POST /sessions/:id/expenses` | `expenses` |
| `POST /sessions/:id/expenses/:eid/evaluate` | `expense_evaluation_results` + `deductions_accumulator_snapshots` + `calculation_messages` |
| `GET /sessions/:id/deductions-summary` | `deductions_accumulator_snapshots` |
| `POST /sessions/:id/buffer` | `tax_buffer_results` + `calculation_messages` |
| `GET /sessions/:id/buffer` | `tax_buffer_results` + `calculation_messages` (REASONING_STEP) |

El query más frecuente de la API será "dame el detalle completo de una sesión":

```sql
SELECT
  fs.*,
  rss.*,
  das.*,
  tbr.*
FROM fiscal_sessions fs
LEFT JOIN regime_session_summary  rss ON rss.session_id = fs.id
LEFT JOIN deductions_accumulator_snapshots das ON das.session_id = fs.id
LEFT JOIN tax_buffer_results      tbr ON tbr.session_id = fs.id
WHERE fs.id = $1 AND fs.user_id = $2;
```

Los índices `idx_fiscal_sessions_user_year`, `idx_buffer_session`, y `idx_calc_messages_session` están diseñados específicamente para ese patrón.

---

## D. Trade-offs deliberados

**`UNIQUE (user_id, exercise_year)` en `fiscal_sessions`** — Un usuario solo puede tener una sesión activa por año. Simplifica la lógica de la API y evita estados inconsistentes. Si se necesitan múltiples simulaciones por año en el futuro, se puede agregar una columna `scenario_name` y cambiar el constraint.

**`income_sources` sin FK a `regime_identification_results`** — La relación es inversa: `regime_identification_results` tiene FK a `income_sources`. Esto permite crear fuentes de ingreso sin ejecutar la identificación inmediatamente (flujo multi-paso de la app).

**`deductions_accumulator_snapshots` como tabla separada** — En lugar de recalcular los totales del acumulador en cada query al buffer, se persiste el snapshot. El API de Express puede leer los totales en O(1) sin recorrer todas las evaluaciones de gastos. Se actualiza al aprobar/rechazar cada gasto.
