# ImpuMate — Core Algorithms

Sistema de lógica fiscal educativa para personas físicas mexicanas (18–29 años) que identifica obligaciones fiscales, evalúa la deducibilidad de gastos y calcula el monto mensual que el usuario debe apartar para cubrir sus impuestos.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)
![Ejercicio fiscal](https://img.shields.io/badge/ejercicio_fiscal-2026-orange)

---

> ⚠️ **Aviso legal:** Este sistema es de carácter educativo y no constituye asesoría fiscal, legal ni contable. Los resultados se basan en reglas generales del SAT para 2026 y pueden no aplicar a cada situación específica. Verificar siempre en [sat.gob.mx](https://www.sat.gob.mx) o consultar a un contador autorizado.

---

## Tabla de contenidos

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Instalación y ejecución](#2-instalación-y-ejecución)
3. [Referencia de módulos](#3-referencia-de-módulos)
   - [taxRegimeIdentifier](#31-taxregimeidentifier)
   - [expenseDeductionAdvisor](#32-expensedeductionadvisor)
   - [deductionsAccumulator](#33-deductionsaccumulator)
   - [taxBufferCalculator](#34-taxbuffercalculator)
4. [Constantes y catálogos](#4-constantes-y-catálogos)
5. [Flujo completo — ejemplo paso a paso](#5-flujo-completo--ejemplo-paso-a-paso)
6. [Base de datos](#6-base-de-datos)
7. [Guía para la API Express](#7-guía-para-la-api-express)
8. [Fuentes oficiales](#8-fuentes-oficiales)

---

## 1. Arquitectura del sistema

### Estructura de archivos

```
integrated-algorithms/
├── README.md
├── runner.js                          ← test runner unificado (secciones A–D)
├── db/
│   ├── schema.sql                     ← esquema PostgreSQL completo (16 tablas, 9 ENUMs)
│   ├── seed_fiscal_parameters.sql     ← parámetros fiscales 2026 (ISR, RESICO, UMA)
│   └── design_notes.md               ← diagrama de entidades y decisiones de diseño
└── src/
    ├── constants/
    │   ├── fiscalConstants.js         ← fuente única de verdad fiscal (tarifas, tasas, topes)
    │   └── taxCatalogs.js             ← enums y catálogos del sistema (OBLIGATIONS, EXPENSE_CATEGORIES…)
    ├── core/
    │   └── deductionsAccumulator.js   ← conector con estado entre módulos 2 y 3
    └── modules/
        ├── taxRegimeIdentifier.js     ← módulo 1: identificación de régimen fiscal
        ├── expenseDeductionAdvisor.js ← módulo 2: evaluación de deducibilidad de gastos
        └── taxBufferCalculator.js     ← módulo 3: cálculo del buffer mensual de impuestos
```

### Flujo de datos entre módulos

```
  Usuario declara perfil SAT + fuentes de ingreso
                    │
                    ▼
  ┌─────────────────────────────────┐
  │     taxRegimeIdentifier         │
  │  identifyTaxRegimesAndObligations│
  └────────────┬────────────────────┘
               │ obligationsDetected[]
               │ requiresSATUpdateNotice
               ▼
  ┌─────────────────────────────────┐
  │     deductionsAccumulator       │
  │  createDeductionsAccumulator()  │
  │                                 │
  │  acc.evaluate(gasto_1) ──────► evaluateExpenseDeductibility()
  │  acc.evaluate(gasto_2) ──────► evaluateExpenseDeductibility()
  │  acc.evaluate(gasto_N) ──────► evaluateExpenseDeductibility()
  │                                 │
  │  (mantiene cap global acumulativo│
  │   y suma IVA acreditable)        │
  └────────────┬────────────────────┘
               │ acc.getSummary()
               │   totalPersonalDeductiblesMXN
               │   totalActivityDeductiblesMXN
               │   totalIVAAcreditableMXN
               ▼
  ┌─────────────────────────────────┐
  │     taxBufferCalculator         │
  │  calculateTaxBuffer()           │
  └────────────┬────────────────────┘
               │
               ▼
      recommendedMonthlyBuffer
      (el número que ve el usuario)
```

### Tabla resumen de módulos

| Módulo | Archivo | Propósito | Input principal | Output principal |
|---|---|---|---|---|
| `taxRegimeIdentifier` | `src/modules/taxRegimeIdentifier.js` | Identifica obligaciones fiscales del usuario comparando realidad económica vs. SAT | Perfil SAT + fuentes de ingreso | `obligationsDetected[]`, `requiresSATUpdateNotice` |
| `expenseDeductionAdvisor` | `src/modules/expenseDeductionAdvisor.js` | Evalúa si un gasto es deducible para ISR, en cuánto y por qué | Obligaciones activas + datos del gasto | `deductibleForISR`, `deductibleAmountMXN`, `deductionKind` |
| `deductionsAccumulator` | `src/core/deductionsAccumulator.js` | Mantiene el estado acumulado entre evaluaciones de gastos individuales | Contexto anual + gastos uno a uno | Totales por tipo + IVA acreditable estimado |
| `taxBufferCalculator` | `src/modules/taxBufferCalculator.js` | Calcula el monto mensual a apartar para cubrir ISR + IVA | Ingresos + deducciones acumuladas + retenciones | `recommendedMonthlyBuffer` |
| `fiscalConstants` | `src/constants/fiscalConstants.js` | Fuente única de verdad de parámetros fiscales 2026 | — | Tarifas ISR, tasas RESICO, topes de deducciones |
| `taxCatalogs` | `src/constants/taxCatalogs.js` | Enums y catálogos del sistema | — | `OBLIGATIONS`, `EXPENSE_CATEGORIES`, `DEDUCTION_KINDS`… |

---

## 2. Instalación y ejecución

### Prerequisitos

- Node.js ≥ 18
- Sin dependencias externas — el repositorio no requiere `npm install`. Todos los módulos son nativos de Node.js (`require`, `module.exports`).

### Ejecutar el test runner

```bash
# Todas las secciones (A, B, C y D)
node runner.js

# Solo Sección A — catálogos de deducciones disponibles por perfil fiscal
node runner.js --seccion=A

# Solo Sección B — 7 casos unitarios del motor de deducibles (INPUT/OUTPUT completo)
node runner.js --seccion=B

# Solo Sección C — 4 perfiles end-to-end: deducibles → acumulador → buffer
node runner.js --seccion=C

# Solo Sección D — 5 casos del identificador de régimen fiscal con assertions
node runner.js --seccion=D
```

### Qué hace cada sección del runner

| Sección | Descripción | Módulo principal |
|---|---|---|
| **A** | Muestra el catálogo de deducciones disponibles para 4 perfiles de usuario distintos | `expenseDeductionAdvisor.buildDeductionCatalog` |
| **B** | 7 casos unitarios con JSON de INPUT y OUTPUT completo: gasto médico, funerario, inversión, arrendamiento, RESICO, donativo | `expenseDeductionAdvisor.evaluateExpenseDeductibility` |
| **C** | 4 perfiles realistas end-to-end: Ana (sueldos), Carlos (sueldos + negocio), Sofía (freelancer), Roberto (límites de deducción) | Los 3 módulos + acumulador |
| **D** | 5 casos con assertions automáticas: salarios, freelance + RESICO, socio/accionista, arrendamiento, plataformas | `taxRegimeIdentifier.identifyTaxRegimesAndObligations` |

---

## 3. Referencia de módulos

### 3.1 taxRegimeIdentifier

**Propósito:** Recibe la realidad económica del usuario (de dónde obtiene ingresos) y la compara contra lo registrado en el SAT. Detecta las obligaciones fiscales que probablemente debería tener activas, y decide si aplica RESICO o régimen general para cada fuente de ingreso por cuenta propia.

#### Función principal

```javascript
identifyTaxRegimesAndObligations(profile, incomeSources, options)
```

#### Input — `profile`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `rfc` | `string` | ✅ | RFC de 13 caracteres |
| `nombreCompleto` | `string` | ✅ | Nombre completo del contribuyente |
| `regimenesRegistradosSAT` | `string[]` | ✅ | Regímenes en la Constancia de Situación Fiscal |
| `obligacionesRegistradasSAT` | `string[]` | ✅ | Obligaciones activas registradas en SAT |
| `esSocioAccionista` | `boolean` | ✅ | Excluye de RESICO (LISR art. 113-E) |
| `esResidenteExtranjeroConEstablecimientoPermanente` | `boolean` | ✅ | Excluye de RESICO |
| `percibeIngresosRegimenPreferente` | `boolean` | ✅ | REFIPRE — excluye de RESICO |
| `estadoCumplimientoSAT` | `string` | ✅ | `AL_CORRIENTE` \| `INCUMPLIMIENTO` \| `EN_REVISION` \| `DESCONOCIDO` |
| `preferirRESICOEnFuentesElegibles` | `boolean` | ❌ | Asigna RESICO automáticamente cuando es elegible |

#### Input — cada elemento de `incomeSources[]`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `idFuente` | `string` | ✅ | Identificador único de la fuente |
| `descripcionLibre` | `string` | ❌ | Descripción en lenguaje libre |
| `tipoEconomicoDeclaradoPorUsuario` | `string` | ❌ | Cómo llama el usuario a su actividad |
| `existeRelacionSubordinada` | `boolean` | ✅ | `true` → sueldos |
| `quienPaga` | `string` | ✅ | `PATRON` \| `PERSONA_MORAL` \| `PERSONA_FISICA` \| `PLATAFORMA` |
| `vendeBienes` | `boolean` | ✅ | `true` → actividad empresarial |
| `prestaServiciosIndependientes` | `boolean` | ✅ | `true` → servicios profesionales |
| `otorgaUsoGoceTemporalInmueble` | `boolean` | ✅ | `true` → arrendamiento |
| `usaPlataformaTecnologicaComoIntermediario` | `boolean` | ✅ | `true` → módulo especializado |
| `montoAnualEstimadoSinIVA` | `number` | ✅ | Proyección anual en MXN (sin IVA) |
| `montoMensualPromedioSinIVA` | `number` | ❌ | Promedio mensual en MXN |
| `emiteCFDI` | `boolean` | ✅ | ¿Emite facturas? |
| `recibeCFDINomina` | `boolean` | ✅ | `true` → también indica sueldos |
| `clienteRetieneISR` | `boolean` | ✅ | ¿El pagador retiene ISR? |
| `clienteRetieneIVA` | `boolean` | ✅ | ¿El pagador retiene IVA? |
| `tratamientoIVAEsperado` | `string` | ✅ | `GRAVADO_16` \| `EXENTO` \| `TASA_CERO` \| `NO_APLICA` \| `POR_DETERMINAR` |
| `solicitaTributarEnRESICO` | `boolean` | ❌ | El usuario pide RESICO para esta fuente explícitamente |

#### Output

| Campo | Tipo | Descripción |
|---|---|---|
| `obligationsDetected` | `object[]` | Una obligación fiscal por fuente de ingreso |
| `inconsistencyAlerts` | `string[]` | Discrepancias entre realidad económica y SAT |
| `globalMissingData` | `string[]` | Datos faltantes para mayor precisión |
| `requiresSATUpdateNotice` | `boolean` | `true` si el usuario debe presentar aviso de actualización |
| `executiveSummary` | `object` | Resumen de alto nivel para UI |
| `recommendedNextSteps` | `string[]` | Pasos operativos recomendados |
| `diagnostics` | `object` | Metadata del cálculo (fecha, parámetros usados) |

Cada elemento de `obligationsDetected`:

| Campo | Tipo | Descripción |
|---|---|---|
| `idObligacion` | `string` | `OBL_` + idFuente |
| `idFuenteIngreso` | `string` | Referencia a la fuente evaluada |
| `categoriaFiscal` | `string` | Valor de `OBLIGATIONS` |
| `impuestosAplicables` | `string[]` | `['ISR']` o `['ISR', 'IVA']` |
| `periodicidadISR` | `string` | `RETENCION_NOMINA` \| `MENSUAL` \| `POR_DETERMINAR` |
| `periodicidadIVA` | `string` | `MENSUAL` \| `NO_APLICA` \| `POR_DETERMINAR` |
| `requiereDeclaracionAnual` | `boolean` | Siempre `true` para personas físicas |
| `datosMinimosFaltantes` | `string[]` | Datos del input que faltaron |
| `motivoDeteccion` | `string` | Explicación en lenguaje natural |

`executiveSummary`:

| Campo | Tipo | Descripción |
|---|---|---|
| `totalObligaciones` | `number` | Conteo de obligaciones detectadas |
| `tieneMultiplesObligaciones` | `boolean` | `true` si hay más de una |
| `tieneRESICO` | `boolean` | ¿Alguna obligación está en RESICO? |
| `tieneSueldos` | `boolean` | ¿Hay ingresos por nómina? |
| `tieneActividadPorCuentaPropia` | `boolean` | ¿Hay actividad, servicios o arrendamiento? |

#### Reglas de negocio

1. **Clasificación por realidad económica, no por nombre.** El campo `tipoEconomicoDeclaradoPorUsuario` se ignora para la lógica. Lo que importa es la combinación de flags booleanos. Prioridad: subordinación/nómina → inmueble → bienes → servicios independientes → plataforma.
2. **RESICO se asigna, no se infiere.** La elegibilidad se evalúa (ingresos ≤ $3.5M, no socio, no REFIPRE, cumplimiento SAT), pero RESICO solo se asigna si el SAT ya lo refleja en el perfil, si el usuario lo solicita explícitamente, o si `preferirRESICOEnFuentesElegibles = true`.
3. **El límite de $3.5M para RESICO se evalúa sobre la suma de todas las fuentes por cuenta propia,** no fuente por fuente (LISR art. 113-E).
4. **Inconsistencia SAT → aviso obligatorio.** Si la obligación detectada no coincide con los regímenes registrados, el usuario debe presentar aviso de actualización dentro del mes siguiente al cambio de situación.
5. **Fuentes de plataforma tecnológica** se derivan a un módulo especializado (`REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS`) en lugar de calcular ISR directamente.

#### Ejemplo de uso

```javascript
const { identifyTaxRegimesAndObligations } = require('./src/modules/taxRegimeIdentifier');

const result = identifyTaxRegimesAndObligations(
  {
    rfc: 'RASO950315AAA',
    nombreCompleto: 'Sofía Ramírez',
    regimenesRegistradosSAT: ['ACTIVIDADES_EMPRESARIALES_Y_PROFESIONALES'],
    obligacionesRegistradasSAT: ['ISR_PAGO_PROVISIONAL_AE', 'IVA_MENSUAL'],
    esSocioAccionista: false,
    esResidenteExtranjeroConEstablecimientoPermanente: false,
    percibeIngresosRegimenPreferente: false,
    estadoCumplimientoSAT: 'AL_CORRIENTE',
  },
  [
    {
      idFuente: 'FUENTE_DISENO',
      descripcionLibre: 'Diseño gráfico independiente',
      tipoEconomicoDeclaradoPorUsuario: 'FREELANCE_SERVICIOS',
      existeRelacionSubordinada: false,
      quienPaga: 'PERSONA_MORAL',
      vendeBienes: false,
      prestaServiciosIndependientes: true,
      otorgaUsoGoceTemporalInmueble: false,
      usaPlataformaTecnologicaComoIntermediario: false,
      montoAnualEstimadoSinIVA: 180000,
      montoMensualPromedioSinIVA: 15000,
      emiteCFDI: true,
      recibeCFDINomina: false,
      clienteRetieneISR: false,
      clienteRetieneIVA: false,
      tratamientoIVAEsperado: 'GRAVADO_16',
    },
  ]
);

// result.obligationsDetected[0].categoriaFiscal
// → 'SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'
// result.requiresSATUpdateNotice → false
// result.executiveSummary.tieneActividadPorCuentaPropia → true
```

---

### 3.2 expenseDeductionAdvisor

**Propósito:** Evalúa si un gasto específico es deducible para ISR dado el perfil fiscal del usuario, en qué monto exacto (aplicando todos los topes y requisitos formales), y produce una explicación detallada de por qué se aprobó o rechazó. Cubre 25 categorías de gasto para personas físicas mexicanas.

#### Función principal

```javascript
evaluateExpenseDeductibility({ currentObligations, annualContext, expense })
```

#### Input — `annualContext`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `annualTotalIncomeMXN` | `number` | ✅ | Ingreso bruto anual total (para calcular tope global) |
| `annualUMAValueMXN` | `number` | ❌ | UMA 2026: $42,794.64 (default del sistema) |
| `alreadyConsumedGlobalPersonalCapMXN` | `number` | ✅ | Cuánto del tope global ya se consumió en evaluaciones previas |
| `currentYearAccumIncomeForRetirementCapMXN` | `number` | ❌ | Para calcular tope de aportaciones a retiro |
| `previousYearAccumIncomeForDonationCapMXN` | `number` | ❌ | Para calcular tope de donativos (7% ingreso año anterior) |
| `usesBlindRentalDeduction` | `boolean` | ❌ | `true` si el arrendador elige la deducción ciega del 35% |

#### Input — `expense` (campos comunes a todas las categorías)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `category` | `string` | ✅ | Valor de `EXPENSE_CATEGORIES` |
| `amountMXN` | `number` | ✅ | Monto del gasto en MXN |
| `hasCFDI` | `boolean` | ✅ | ¿Tiene factura electrónica (CFDI)? |
| `paymentMethod` | `string` | ❌ | Valor de `PAYMENT_METHODS` |
| `invoiceReceiverRFCMatchesTaxpayer` | `boolean` | ✅ | ¿La factura está a nombre del contribuyente? |
| `paidFromTaxpayerAccount` | `boolean` | ✅ | ¿El pago salió de cuenta del contribuyente? |
| `paidInRelevantFiscalYear` | `boolean` | ✅ | ¿El pago fue en el ejercicio fiscal correspondiente? |
| `beneficiaryRelationship` | `string` | ❌ | Para gastos personales: `SELF` \| `SPOUSE` \| `CHILD` \| `PARENT` \| etc. |
| `isStrictlyIndispensableForActivity` | `boolean` | ❌ | Para gastos de actividad empresarial |
| `isActuallyPaid` | `boolean` | ❌ | Para gastos de actividad y arrendamiento |
| `assetType` | `string` | ❌ | Para inversiones: `COMPUTER_EQUIPMENT` \| `CONSTRUCTION` \| `AUTOMOBILE` \| etc. |

#### Output

| Campo | Tipo | Descripción |
|---|---|---|
| `deductibleForISR` | `boolean` | Resultado principal: ¿es deducible? |
| `deductionKind` | `string` | Valor de `DEDUCTION_KINDS` |
| `deductibleAmountMXN` | `number` | Monto exacto deducible en MXN |
| `deductiblePercentageOverExpense` | `number` | Porcentaje deducible sobre el gasto original (0–1) |
| `capAppliedDescription` | `string` | Descripción del tope aplicado |
| `reasons` | `string[]` | Por qué fue rechazado (vacío si aprobado) |
| `warnings` | `string[]` | Advertencias no bloqueantes |
| `missingData` | `string[]` | Datos que faltan para evaluar con mayor precisión |
| `officialSourceNotes` | `string[]` | Referencias a fuentes oficiales del SAT/LISR |

#### Función auxiliar

```javascript
buildDeductionCatalog({ currentObligations, usesBlindRentalDeduction })
```

Devuelve un array de `{ family, item, rule }` describiendo qué puede deducir el usuario dado su perfil fiscal, **antes** de registrar gastos individuales. Útil para la pantalla inicial de la feature de deducibles.

#### Reglas de negocio

1. **RESICO no tiene deducciones de gastos para ISR.** Si `currentObligations` incluye cualquier variante RESICO, el módulo retorna `deductibleForISR: false` para cualquier gasto de actividad (LISR art. 113-E).
2. **Tope global de deducciones personales.** Se aplica el menor entre 5 UMA anuales ($213,973.20 en 2026) y 15% del ingreso total. Es **acumulativo** entre evaluaciones — el `deductionsAccumulator` lo mantiene en `alreadyConsumedGlobalPersonalCapMXN`.
3. **Pagos en efectivo mayores a $2,000 MXN no son deducibles** para actividad empresarial (LISR art. 27).
4. **Inversiones se deducen parcialmente:** solo el porcentaje anual según tipo de activo, no el 100% del gasto. Equipo de cómputo: 30%; automóvil: 25%; construcción: 5%; instalaciones/mobiliario: 10%.
5. **Arrendamiento con deducción ciega (35%):** al activar `usesBlindRentalDeduction`, los gastos de mantenimiento, agua y similares dejan de ser deducibles individualmente (ya están incluidos en el 35%). El predial sí se puede deducir adicionalmente.
6. **Gastos médicos por discapacidad** (≥50% reconocida con certificado) están **fuera del tope global** y son deducibles al 100%.
7. **Beneficiarios permitidos** para deducciones personales: contribuyente, cónyuge/concubino, padres, abuelos, hijos, nietos.

#### Ejemplo de uso

```javascript
const { evaluateExpenseDeductibility } = require('./src/modules/expenseDeductionAdvisor');
const { OBLIGATIONS, EXPENSE_CATEGORIES, PAYMENT_METHODS } = require('./src/constants/taxCatalogs');
const { FISCAL_CONSTANTS } = require('./src/constants/fiscalConstants');

const result = evaluateExpenseDeductibility({
  currentObligations: [OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL],
  annualContext: {
    annualTotalIncomeMXN: 180000,
    annualUMAValueMXN: FISCAL_CONSTANTS.ANNUAL_UMA_VALUE_MXN,
    alreadyConsumedGlobalPersonalCapMXN: 0,
  },
  expense: {
    category: EXPENSE_CATEGORIES.BUSINESS_PHONE_INTERNET,
    amountMXN: 7200,
    hasCFDI: true,
    invoiceReceiverRFCMatchesTaxpayer: true,
    paymentMethod: PAYMENT_METHODS.DEBIT_CARD,
    isStrictlyIndispensableForActivity: true,
    isActuallyPaid: true,
  },
});

// result.deductibleForISR          → true
// result.deductionKind             → 'BUSINESS_CURRENT_PERIOD_ISR'
// result.deductibleAmountMXN       → 7200
// result.deductiblePercentageOverExpense → 1
// result.capAppliedDescription     → 'Gasto ordinario de actividad: 100%.'
```

---

### 3.3 deductionsAccumulator

**Propósito:** Conector con estado entre `expenseDeductionAdvisor` y `taxBufferCalculator`. Resuelve dos problemas que ninguno de los otros módulos puede resolver por sí solo: (1) el tope global de deducciones personales es **acumulativo** entre evaluaciones individuales, y (2) el buffer necesita **totales** por tipo de deducción, no evaluaciones una por una.

#### API pública

```javascript
const { createDeductionsAccumulator } = require('./src/core/deductionsAccumulator');

// Crear instancia para una sesión
const acc = createDeductionsAccumulator(annualContext);

// Evaluar un gasto y acumularlo si se aprueba
const evalResult = acc.evaluate(expense, currentObligations);

// Obtener totales acumulados para pasarlos al buffer
const summary = acc.getSummary();

// Reiniciar para una nueva sesión o período
acc.reset();
```

#### Input — `annualContext`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `annualTotalIncomeMXN` | `number` | ✅ | Ingreso bruto anual total |
| `annualUMAValueMXN` | `number` | ❌ | Default: $42,794.64 |
| `currentYearAccumIncomeForRetirementCapMXN` | `number` | ❌ | Para tope de aportaciones retiro |
| `previousYearAccumIncomeForDonationCapMXN` | `number` | ❌ | Para tope de donativos |
| `usesBlindRentalDeduction` | `boolean` | ❌ | Deducción ciega arrendamiento |

#### Output — `acc.getSummary()`

| Campo | Tipo | Descripción |
|---|---|---|
| `totalPersonalDeductiblesMXN` | `number` | Suma de deducciones `PERSONAL_ANNUAL` aprobadas |
| `totalActivityDeductiblesMXN` | `number` | Suma de deducciones de actividad aprobadas |
| `totalIVAAcreditableMXN` | `number` | IVA acreditable estimado (16% de gastos de actividad elegibles) |
| `totalDeductiblesMXN` | `number` | Suma total (personal + actividad) |
| `approvedExpenses` | `object[]` | Gastos aprobados con su monto deducible |
| `rejectedExpenses` | `object[]` | Gastos rechazados con sus razones |
| `approvedCount` | `number` | Conteo de aprobados |
| `rejectedCount` | `number` | Conteo de rechazados |

#### Reglas de negocio

1. **El tope global se actualiza automáticamente** entre evaluaciones. Cada gasto personal aprobado reduce el cap disponible para el siguiente.
2. **IVA acreditable**: se acumula automáticamente al 16% sobre los gastos de actividad aprobados que tienen CFDI y **no** están en `CATEGORIES_WITHOUT_IVA_ACREDITABLE` (15 categorías exentas: gastos médicos, educación, seguros, funerarias, intereses financieros, IMSS, impuestos locales — ver [Sección 4](#4-constantes-y-catálogos)).
3. **El acumulador no persiste entre sesiones de Node.** En producción, los totales deben guardarse en `deductions_accumulator_snapshots` de la BD después de cada evaluación.

#### Ejemplo de uso

```javascript
const { createDeductionsAccumulator } = require('./src/core/deductionsAccumulator');
const { OBLIGATIONS, EXPENSE_CATEGORIES, PAYMENT_METHODS } = require('./src/constants/taxCatalogs');

const acc = createDeductionsAccumulator({ annualTotalIncomeMXN: 180000 });

// Evaluar gastos uno por uno
acc.evaluate({
  category: EXPENSE_CATEGORIES.BUSINESS_PHONE_INTERNET,
  amountMXN: 7200,
  hasCFDI: true,
  invoiceReceiverRFCMatchesTaxpayer: true,
  paymentMethod: PAYMENT_METHODS.DEBIT_CARD,
  isStrictlyIndispensableForActivity: true,
  isActuallyPaid: true,
}, [OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL]);

acc.evaluate({
  category: EXPENSE_CATEGORIES.BUSINESS_INVESTMENT,
  amountMXN: 12000,
  hasCFDI: true,
  invoiceReceiverRFCMatchesTaxpayer: true,
  isStrictlyIndispensableForActivity: true,
  assetType: 'COMPUTER_EQUIPMENT', // se deduce el 30% anual = $3,600
}, [OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL]);

const summary = acc.getSummary();
// summary.totalActivityDeductiblesMXN → 10800  (7200 + 3600)
// summary.totalIVAAcreditableMXN      → 1728   (10800 × 0.16)
// summary.approvedCount               → 2
```

---

### 3.4 taxBufferCalculator

**Propósito:** Calcula el monto mensual que el usuario debe apartar para no quedarse sin efectivo cuando llegue su declaración. No es solo el ISR calculado — incluye IVA pendiente, descuenta retenciones ya aplicadas, y agrega un margen de seguridad calibrado al nivel de variabilidad de cada régimen.

#### Función principal

```javascript
calculateTaxBuffer({ currentObligations, incomeSources, annualContext, bufferHorizonMonths })
```

#### Input — cada elemento de `incomeSources[]`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `obligationType` | `string` | ✅ | Valor de `OBLIGATIONS` |
| `grossAnnualAmountMXN` | `number` | ✅ | Ingreso bruto anual de esta fuente en MXN |
| `isSubjectToIVA` | `boolean` | ✅ | ¿Esta actividad causa IVA al 16%? |

#### Input — `annualContext`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `totalApprovedPersonalDeductiblesMXN` | `number` | ✅ | Del `acc.getSummary()` |
| `totalApprovedActivityDeductiblesMXN` | `number` | ✅ | Del `acc.getSummary()` |
| `totalEstimatedIVAAcreditableMXN` | `number` | ✅ | Del `acc.getSummary()` |
| `isrAlreadyWithheldBySalaryMXN` | `number` | ✅ | ISR retenido por el empleador en el año |
| `ivaAlreadyPaidToSATMXN` | `number` | ✅ | IVA ya enterado en pagos provisionales |

#### Input — `bufferHorizonMonths`

| Campo | Tipo | Rango | Descripción |
|---|---|---|---|
| `bufferHorizonMonths` | `number` | 1–12 | Número de meses sobre los que dividir el pasivo total |

#### Output

| Campo | Tipo | Descripción |
|---|---|---|
| `recommendedMonthlyBuffer` | `number` | ⭐ El número que ve el usuario en MXN/mes |
| `grossIncomeByObligation` | `object` | Ingresos brutos por tipo de obligación |
| `taxableBaseByObligation` | `object` | Base gravable (ingreso − deducciones) por obligación |
| `estimatedISRByObligation` | `object` | ISR calculado por obligación |
| `estimatedIVACausado` | `number` | IVA bruto causado por las actividades gravadas |
| `estimatedIVAAcreditable` | `number` | IVA acreditable descontado |
| `estimatedIVAOwed` | `number` | IVA pendiente neto a pagar |
| `totalTaxLiability` | `number` | Pasivo fiscal bruto (ISR + IVA) |
| `remainingTaxAfterCredits` | `number` | Pasivo después de descontar retenciones |
| `totalWithSafetyMargin` | `number` | Pasivo con margen de seguridad aplicado |
| `bufferHorizonMonths` | `number` | Horizonte usado |
| `safetyMarginApplied` | `number` | Margen promedio aplicado (ej. 1.15) |
| `reasoning` | `string[]` | Pasos del cálculo en lenguaje natural (ordenados) |
| `warnings` | `string[]` | Advertencias (ej. IVA acreditable no proporcionado) |
| `missingData` | `string[]` | Datos faltantes |
| `disclaimer` | `string` | Aviso legal obligatorio |

#### Pipeline de cálculo (9 pasos)

```
[1] Agregar ingresos brutos por tipo de obligación
[2] Distribuir deducciones aprobadas pro-rata entre obligaciones elegibles
    (personales → no-RESICO; actividad → régimen general)
[3] Base gravable = ingreso bruto − deducciones asignadas (mínimo 0)
[4] ISR por obligación:
    - Régimen general → tarifa marginal art. 152 LISR (11 tramos)
    - RESICO → tasa plana art. 113-E (5 tramos, sobre ingreso TOTAL)
[5] IVA pendiente = IVA causado − IVA acreditable − IVA ya enterado
[6] Pasivo total = ISR total + IVA pendiente
[7] Descontar ISR retenido por empleador
[8] Aplicar margen de seguridad por obligación
[9] Buffer mensual = pasivo con margen ÷ horizonte de meses
```

#### Reglas de negocio

1. **ISR RESICO es tasa plana, no marginal.** Al cruzar un umbral de ingresos (ej. $300k), **toda** la base paga la nueva tasa, no solo el excedente. Es un salto de escalón, no una rampa. Esto significa que ganar $1 extra cerca de un umbral puede cambiar el ISR de toda la base.
2. **Distribución de deducciones es proporcional al ingreso.** Si el 75% del ingreso es de sueldos y 25% de freelance, el 75% de las deducciones personales se asignan al sueldo. El SAT no permite asignarlas arbitrariamente a una sola obligación.
3. **RESICO no recibe deducciones de actividad** para ISR. El sistema distribuye cero deducciones a obligaciones RESICO.
4. **Los márgenes de seguridad son parámetros de producto**, no de ley. Cubren variabilidad de ingreso, ajustes en declaración anual y recargos por pago tardío.
5. **Si `recommendedMonthlyBuffer = 0`** es porque el empleador ya retuvo suficiente (o más). El usuario probablemente tiene saldo a favor en su declaración anual de abril.

#### Ejemplo de uso

```javascript
const { calculateTaxBuffer } = require('./src/modules/taxBufferCalculator');
const { OBLIGATIONS } = require('./src/constants/taxCatalogs');

const result = calculateTaxBuffer({
  currentObligations: [OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL],
  incomeSources: [
    {
      obligationType: OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL,
      grossAnnualAmountMXN: 180000,
      isSubjectToIVA: true,
    },
  ],
  annualContext: {
    totalApprovedPersonalDeductiblesMXN: 0,
    totalApprovedActivityDeductiblesMXN: 19200, // del accumulator
    totalEstimatedIVAAcreditableMXN: 3072,       // del accumulator
    isrAlreadyWithheldBySalaryMXN: 0,
    ivaAlreadyPaidToSATMXN: 4800,
  },
  bufferHorizonMonths: 1,
});

// result.recommendedMonthlyBuffer → 42298.46
// result.taxableBaseByObligation['SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'] → 160800
// result.estimatedISRByObligation['SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'] → 15192.72
// result.estimatedIVAOwed → 20928
```

---

## 4. Constantes y catálogos

### OBLIGATIONS (9 valores)

| Valor | Descripción |
|---|---|
| `SUELDOS_Y_SALARIOS` | Empleo formal con patrón, CFDI de nómina |
| `ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL` | Venta de bienes por cuenta propia, régimen general |
| `SERVICIOS_PROFESIONALES_REGIMEN_GENERAL` | Servicios independientes (consultoría, diseño, etc.), régimen general |
| `ARRENDAMIENTO_REGIMEN_GENERAL` | Renta de inmuebles, régimen general |
| `ACTIVIDAD_EMPRESARIAL_RESICO` | Venta de bienes, RESICO PF (art. 113-E) |
| `SERVICIOS_PROFESIONALES_RESICO` | Servicios independientes, RESICO PF |
| `ARRENDAMIENTO_RESICO` | Renta de inmuebles, RESICO PF |
| `REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS` | Ingresos por plataformas digitales (Uber, Airbnb, etc.) |
| `NO_DETERMINADA` | No se pudo clasificar automáticamente |

### EXPENSE_CATEGORIES (25 valores)

#### Deducciones personales (10)

| Valor | Tope aplicable |
|---|---|
| `PERSONAL_MEDICAL` | Tope global (5 UMA o 15% ingreso) |
| `PERSONAL_MEDICAL_DISABILITY` | Sin tope global (100%, fuera del cap) |
| `PERSONAL_OPTICAL_LENSES` | $2,500 MXN por ejercicio |
| `PERSONAL_MEDICAL_INSURANCE` | Tope global |
| `PERSONAL_TUITION` | Tope por nivel educativo (ver tabla siguiente) |
| `PERSONAL_SCHOOL_TRANSPORT` | Tope global |
| `PERSONAL_FUNERAL` | 1 UMA anual ($42,794.64 en 2026) |
| `PERSONAL_DONATION` | 7% del ingreso del año anterior (4% si es gobierno) |
| `PERSONAL_RETIREMENT_CONTRIBUTION` | Menor entre 10% del ingreso acumulable y 5 UMA |
| `PERSONAL_MORTGAGE_REAL_INTEREST` | Solo interés real; crédito ≤ 750,000 UDIS |

#### Actividad empresarial / servicios profesionales (9)

| Valor | Deducción |
|---|---|
| `BUSINESS_INVENTORY_OR_RAW_MATERIALS` | 100% |
| `BUSINESS_GENERAL_NECESSARY_EXPENSE` | 100% |
| `BUSINESS_OFFICE_RENT` | 100% |
| `BUSINESS_UTILITIES` | 100% |
| `BUSINESS_PHONE_INTERNET` | 100% |
| `BUSINESS_INTEREST` | 100% (sin IVA acreditable) |
| `BUSINESS_IMSS` | 100% (sin IVA acreditable) |
| `BUSINESS_LOCAL_TAX` | 100% (sin IVA acreditable) |
| `BUSINESS_INVESTMENT` | Tasa anual según `assetType` (30% cómputo, 25% auto, 5% construcción, 10% otros) |

#### Arrendamiento (6)

| Valor | Deducción |
|---|---|
| `ARR_PROPERTY_TAX` | 100% (también deducible con deducción ciega) |
| `ARR_MAINTENANCE_OR_WATER` | 100% (NO con deducción ciega) |
| `ARR_REAL_INTEREST` | 100% (sin IVA acreditable) |
| `ARR_SALARIES_FEES_TAXES` | 100% |
| `ARR_INSURANCE` | 100% (sin IVA acreditable) |
| `ARR_CONSTRUCTION_INVESTMENT` | 5% anual |

### DEDUCTION_KINDS (7 valores)

| Valor | Cuándo aplica |
|---|---|
| `NOT_DEDUCTIBLE` | El gasto fue rechazado por cualquier razón |
| `PERSONAL_ANNUAL` | Deducciones personales (médicos, educación, etc.) |
| `BUSINESS_CURRENT_PERIOD_ISR` | Gasto ordinario de actividad empresarial/profesional |
| `BUSINESS_ANNUAL_INVESTMENT_ISR` | Inversión de actividad (se deduce % anual, no el total) |
| `ARR_CURRENT_PERIOD_ISR` | Gasto ordinario de arrendamiento |
| `ARR_ANNUAL_INVESTMENT_ISR` | Inversión de arrendamiento (construcción) |
| `ARR_OPTIONAL_35_ISR` | Arrendamiento con deducción ciega (35%) |

### Parámetros fiscales 2026

| Parámetro | Valor | Fuente |
|---|---|---|
| Valor anual UMA | $42,794.64 MXN | INEGI 2026 |
| Tasa general IVA | 16% | LIVA art. 1 |
| Límite anual RESICO | $3,500,000 MXN | LISR art. 113-E |
| Umbral pago bancarizado | $2,000 MXN | LISR art. 27 |
| Tope global deducciones personales | min(5 UMA, 15% del ingreso) | SAT minisitio |
| Colegiaturas — Preescolar | $14,200 MXN | SAT colegiaturas |
| Colegiaturas — Primaria | $12,900 MXN | SAT colegiaturas |
| Colegiaturas — Secundaria | $19,900 MXN | SAT colegiaturas |
| Colegiaturas — Profesional técnico | $17,100 MXN | SAT colegiaturas |
| Colegiaturas — Bachillerato | $24,500 MXN | SAT colegiaturas |
| Deducción inversión — Equipo de cómputo | 30% anual | LISR art. 34 |
| Deducción inversión — Automóvil | 25% anual | LISR art. 34 |
| Deducción inversión — Construcción | 5% anual | LISR art. 34 |
| Deducción inversión — Instalaciones / Mobiliario | 10% anual | LISR art. 34 |

### Márgenes de seguridad del buffer por obligación

| Obligación | Margen | Justificación |
|---|---|---|
| `SUELDOS_Y_SALARIOS` | ×1.05 | El patrón ya retuvo la mayoría → riesgo muy bajo |
| `ACTIVIDAD_EMPRESARIAL_RESICO` | ×1.10 | Tasa directa, menos incertidumbre |
| `SERVICIOS_PROFESIONALES_RESICO` | ×1.10 | Idem |
| `ARRENDAMIENTO_RESICO` | ×1.10 | Idem |
| `ARRENDAMIENTO_REGIMEN_GENERAL` | ×1.15 | Riesgo moderado |
| `DEFAULT` | ×1.15 | Para casos no catalogados |
| `ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL` | ×1.20 | Ingreso variable, mayor riesgo |
| `SERVICIOS_PROFESIONALES_REGIMEN_GENERAL` | ×1.20 | Ingreso variable, mayor riesgo |

---

## 5. Flujo completo — ejemplo paso a paso

**Perfil: Sofía Ramírez** — diseñadora gráfica independiente, Oaxaca, $180,000 anuales variables. Tres gastos de actividad. Sin retenciones de ISR. Ya pagó $4,800 de IVA provisional.

### Paso 1 — Identificar el régimen fiscal

```javascript
const { identifyTaxRegimesAndObligations } = require('./src/modules/taxRegimeIdentifier');

const regResult = identifyTaxRegimesAndObligations(
  {
    rfc: 'RASO950315AAA',
    nombreCompleto: 'Sofía Ramírez',
    regimenesRegistradosSAT: ['ACTIVIDADES_EMPRESARIALES_Y_PROFESIONALES'],
    obligacionesRegistradasSAT: ['ISR_PAGO_PROVISIONAL_AE', 'IVA_MENSUAL'],
    esSocioAccionista: false,
    esResidenteExtranjeroConEstablecimientoPermanente: false,
    percibeIngresosRegimenPreferente: false,
    estadoCumplimientoSAT: 'AL_CORRIENTE',
  },
  [{
    idFuente: 'FUENTE_DISENO',
    descripcionLibre: 'Diseño gráfico independiente',
    tipoEconomicoDeclaradoPorUsuario: 'FREELANCE_SERVICIOS',
    existeRelacionSubordinada: false,
    quienPaga: 'PERSONA_MORAL',
    vendeBienes: false,
    prestaServiciosIndependientes: true,  // ← clave de clasificación
    otorgaUsoGoceTemporalInmueble: false,
    usaPlataformaTecnologicaComoIntermediario: false,
    montoAnualEstimadoSinIVA: 180000,
    montoMensualPromedioSinIVA: 15000,
    emiteCFDI: true,
    recibeCFDINomina: false,
    clienteRetieneISR: false,
    clienteRetieneIVA: false,
    tratamientoIVAEsperado: 'GRAVADO_16',
  }]
);

// Output clave:
// regResult.obligationsDetected[0].categoriaFiscal
//   → 'SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'
// regResult.requiresSATUpdateNotice → false  (SAT ya lo refleja)
// regResult.executiveSummary.tieneActividadPorCuentaPropia → true
// regResult.executiveSummary.tieneRESICO → false
```

### Paso 2 — Crear el acumulador y evaluar gastos

```javascript
const { createDeductionsAccumulator } = require('./src/core/deductionsAccumulator');
const { OBLIGATIONS, EXPENSE_CATEGORIES, PAYMENT_METHODS } = require('./src/constants/taxCatalogs');

const obligations = ['SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'];
const acc = createDeductionsAccumulator({ annualTotalIncomeMXN: 180000 });

// Gasto 1: Internet y teléfono ($600/mes × 12)
acc.evaluate({
  category: EXPENSE_CATEGORIES.BUSINESS_PHONE_INTERNET,
  amountMXN: 7200,
  hasCFDI: true,
  invoiceReceiverRFCMatchesTaxpayer: true,
  paymentMethod: PAYMENT_METHODS.DEBIT_CARD,
  isStrictlyIndispensableForActivity: true,
  isActuallyPaid: true,
}, obligations);
// → deductibleForISR: true | deductibleAmountMXN: 7200 (100%)
// → deductionKind: 'BUSINESS_CURRENT_PERIOD_ISR'

// Gasto 2: Tableta para diseño ($12,000 — equipo de cómputo)
acc.evaluate({
  category: EXPENSE_CATEGORIES.BUSINESS_INVESTMENT,
  amountMXN: 12000,
  hasCFDI: true,
  invoiceReceiverRFCMatchesTaxpayer: true,
  isStrictlyIndispensableForActivity: true,
  assetType: 'COMPUTER_EQUIPMENT', // tasa anual: 30%
}, obligations);
// → deductibleForISR: true | deductibleAmountMXN: 3600 (30% de $12,000)
// → deductionKind: 'BUSINESS_ANNUAL_INVESTMENT_ISR'

// Gasto 3: Materiales y licencias de software ($700/mes × 12)
acc.evaluate({
  category: EXPENSE_CATEGORIES.BUSINESS_GENERAL_NECESSARY_EXPENSE,
  amountMXN: 8400,
  hasCFDI: true,
  invoiceReceiverRFCMatchesTaxpayer: true,
  paymentMethod: PAYMENT_METHODS.CREDIT_CARD,
  isStrictlyIndispensableForActivity: true,
  isActuallyPaid: true,
}, obligations);
// → deductibleForISR: true | deductibleAmountMXN: 8400 (100%)

const summary = acc.getSummary();
// summary.totalPersonalDeductiblesMXN → 0      (Sofía no registró personales)
// summary.totalActivityDeductiblesMXN → 19200  (7200 + 3600 + 8400)
// summary.totalIVAAcreditableMXN      → 3072   (19200 × 0.16)
// summary.approvedCount               → 3
// summary.rejectedCount               → 0
```

### Paso 3 — Calcular el buffer mensual

```javascript
const { calculateTaxBuffer } = require('./src/modules/taxBufferCalculator');

const bufResult = calculateTaxBuffer({
  currentObligations: ['SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'],
  incomeSources: [{
    obligationType: 'SERVICIOS_PROFESIONALES_REGIMEN_GENERAL',
    grossAnnualAmountMXN: 180000,
    isSubjectToIVA: true,  // el diseño gráfico causa IVA al 16%
  }],
  annualContext: {
    totalApprovedPersonalDeductiblesMXN: summary.totalPersonalDeductiblesMXN, // 0
    totalApprovedActivityDeductiblesMXN: summary.totalActivityDeductiblesMXN, // 19200
    totalEstimatedIVAAcreditableMXN:     summary.totalIVAAcreditableMXN,      // 3072
    isrAlreadyWithheldBySalaryMXN: 0,    // nadie le retiene a Sofía
    ivaAlreadyPaidToSATMXN: 4800,        // ya pagó en pagos provisionales
  },
  bufferHorizonMonths: 1,
});

// Razonamiento del sistema (bufResult.reasoning):
// [1] Ingresos brutos anuales: $180,000 MXN en 1 obligación.
// [2] Deducciones: $19,200 (personales $0, actividad $19,200).
// [3] Base gravable = $180,000 − $19,200 = $160,800 MXN
// [4] ISR (tarifa art. 152 LISR) = $15,192.72 MXN
// [5] IVA causado $28,800 − acreditable $3,072 − ya pagado $4,800 = $20,928 pendiente
// [6] Pasivo bruto: $15,192.72 + $20,928 = $36,120.72 MXN
// [Margen] ISR × 1.20 + IVA × 1.15 = $42,298.46
// [9] Buffer = $42,298.46 ÷ 1 mes = $42,298.46 MXN/mes

// Resultado final:
// bufResult.recommendedMonthlyBuffer → 42298.46
// bufResult.taxableBaseByObligation['SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'] → 160800
// bufResult.estimatedISRByObligation['SERVICIOS_PROFESIONALES_REGIMEN_GENERAL'] → 15192.72
// bufResult.estimatedIVAOwed → 20928
```

**En lenguaje natural:** Sofía tiene $180,000 de ingresos anuales. Sus gastos de actividad aprobados ($19,200) reducen su base gravable a $160,800, sobre la que el ISR es $15,192.72. Adicionalmente causó $28,800 de IVA, de los cuales puede acreditar $3,072 por sus gastos de actividad y ya pagó $4,800 en pagos provisionales, quedando $20,928 pendientes. El sistema aplica un margen de seguridad del 20% al ISR (ingresos variables = mayor riesgo) y del 15% al IVA, resultando en **$42,298 que debe tener disponibles para el día 17 del mes siguiente**.

---

## 6. Base de datos

### Archivos en `db/`

| Archivo | Propósito |
|---|---|
| `schema.sql` | Esquema completo de PostgreSQL 15+. 16 tablas, 9 ENUMs, 19 índices, 19 foreign keys. Orden topológico de creación sin dependencias rotas. |
| `seed_fiscal_parameters.sql` | Datos fiscales 2026: 11 tramos tarifa ISR art. 152, 5 tasas RESICO art. 113-E, 8 márgenes de seguridad, parámetros generales (UMA, IVA, topes). |
| `design_notes.md` | Diagrama ASCII de entidades, las 3 decisiones de diseño más importantes, tabla de mapeo REST→tabla, trade-offs deliberados. |

### Inicialización

```bash
# Crear la base de datos
createdb impumate_db

# Aplicar el schema
psql -d impumate_db -f db/schema.sql

# Sembrar parámetros fiscales 2026
psql -d impumate_db -f db/seed_fiscal_parameters.sql
```

### Tablas principales y su responsabilidad REST

| Tabla | Recurso REST | Módulo JS relacionado |
|---|---|---|
| `users` | `POST /auth/register`, `GET /users/:id` | — |
| `user_sat_regimes` | Subrecurso de `users` | `taxRegimeIdentifier` (input) |
| `user_sat_obligations` | Subrecurso de `users` | `taxRegimeIdentifier` (input) |
| `fiscal_sessions` | `POST /sessions`, `GET /sessions/:id` | Contenedor de todos los cálculos |
| `income_sources` | `POST /sessions/:id/income-sources` | `taxRegimeIdentifier` (input) |
| `regime_identification_results` | `POST /sessions/:id/identify` | `taxRegimeIdentifier` (output) |
| `regime_session_summary` | `GET /sessions/:id/regime-summary` | `taxRegimeIdentifier` (executiveSummary) |
| `expenses` | `POST /sessions/:id/expenses` | `expenseDeductionAdvisor` (input) |
| `expense_evaluation_results` | `POST /sessions/:id/expenses/:eid/evaluate` | `expenseDeductionAdvisor` (output) |
| `deductions_accumulator_snapshots` | `GET /sessions/:id/deductions-summary` | `deductionsAccumulator` (getSummary) |
| `tax_buffer_results` | `POST /sessions/:id/buffer`, `GET /sessions/:id/buffer` | `taxBufferCalculator` (output) |
| `calculation_messages` | Subrecurso de evaluaciones (trazabilidad) | Todos los módulos (arrays de mensajes) |
| `fiscal_parameters` | `GET /fiscal-parameters/:year` | `fiscalConstants.js` (fuente) |
| `isr_annual_tariff_brackets` | Interno (consulta por año al calcular) | `taxBufferCalculator` |
| `resico_isr_rate_brackets` | Interno | `taxBufferCalculator` |
| `buffer_safety_margins` | Interno | `taxBufferCalculator` |

Para el diseño detallado de la BD (decisiones de normalización, uso de JSONB, tabla polimórfica `calculation_messages`, índices estratégicos) ver [`db/design_notes.md`](./db/design_notes.md).

---

## 7. Guía para la API Express

### Mapeo de endpoints a módulos y tablas

| Endpoint | Método | Módulo JS | Tabla(s) BD |
|---|---|---|---|
| `/auth/register` | POST | — | `users` |
| `/auth/login` | POST | — | `users` |
| `/sessions` | POST | — | `fiscal_sessions` |
| `/sessions/:id/income-sources` | POST | — | `income_sources` |
| `/sessions/:id/identify` | POST | `identifyTaxRegimesAndObligations` | `regime_identification_results`, `regime_session_summary`, `calculation_messages` |
| `/sessions/:id/regime-summary` | GET | — | `regime_session_summary` |
| `/sessions/:id/deduction-catalog` | GET | `buildDeductionCatalog` | `regime_identification_results` (para leer obligaciones) |
| `/sessions/:id/expenses` | POST | — | `expenses` |
| `/sessions/:id/expenses/:eid/evaluate` | POST | `evaluateExpenseDeductibility` | `expense_evaluation_results`, `deductions_accumulator_snapshots`, `calculation_messages` |
| `/sessions/:id/deductions-summary` | GET | — | `deductions_accumulator_snapshots` |
| `/sessions/:id/buffer` | POST | `calculateTaxBuffer` | `tax_buffer_results`, `calculation_messages` |
| `/sessions/:id/buffer` | GET | — | `tax_buffer_results`, `calculation_messages` |
| `/fiscal-parameters/:year` | GET | — | `fiscal_parameters`, `isr_annual_tariff_brackets`, `resico_isr_rate_brackets` |

### Orden de implementación recomendado

```
1. Auth (users, JWT)
      ↓
2. Fiscal sessions (crear y leer sesión por usuario + año)
      ↓
3. Income sources + Regime identification
   (taxRegimeIdentifier: el perfil del usuario queda definido aquí)
      ↓
4. Expenses + Expense evaluation
   (expenseDeductionAdvisor: iteración de N gastos con feedback inmediato)
      ↓
5. Deductions summary (leer el snapshot del acumulador)
      ↓
6. Buffer calculation
   (taxBufferCalculator: consume el snapshot → produce el número final)
      ↓
7. Fiscal parameters (CRUD de catálogos — puede hacerse en paralelo con 1)
```

### ⚠️ Advertencia sobre el estado del acumulador

El `deductionsAccumulator` mantiene el tope global de deducciones personales en memoria. En la API Express **este estado no puede vivir entre requests**.

Hay dos estrategias válidas:

**Opción A — Recalcular en cada request de evaluación (recomendada para MVP):**
Al recibir `POST /sessions/:id/expenses/:eid/evaluate`, leer todas las evaluaciones previas aprobadas de la sesión desde `expense_evaluation_results`, reconstruir el acumulador, evaluar el nuevo gasto, y guardar el snapshot actualizado en `deductions_accumulator_snapshots`.

**Opción B — Snapshot incremental:**
Leer el snapshot actual de `deductions_accumulator_snapshots`, inicializar el acumulador con ese estado, evaluar el nuevo gasto, y actualizar el snapshot. Más eficiente en sesiones con muchos gastos, pero requiere cuidado con condiciones de carrera en requests concurrentes.

```javascript
// Patrón de la Opción A en un controller de Express:
async function evaluateExpense(req, res) {
  const { sessionId, expenseId } = req.params;

  // 1. Leer contexto de la sesión
  const session = await db.query('SELECT * FROM fiscal_sessions WHERE id = $1', [sessionId]);

  // 2. Reconstruir acumulador desde evaluaciones previas
  const prevEvals = await db.query(
    'SELECT * FROM expense_evaluation_results WHERE session_id = $1 AND deductible_for_isr = true',
    [sessionId]
  );
  const acc = createDeductionsAccumulator({ annualTotalIncomeMXN: session.annual_total_income_mxn });
  // ... replay de evaluaciones previas ...

  // 3. Evaluar el nuevo gasto
  const expense = await db.query('SELECT * FROM expenses WHERE id = $1', [expenseId]);
  const result = acc.evaluate(expenseToJS(expense), currentObligations);

  // 4. Persistir resultado y snapshot actualizado
  await db.query('INSERT INTO expense_evaluation_results ...', [result]);
  const summary = acc.getSummary();
  await db.query('INSERT INTO deductions_accumulator_snapshots ... ON CONFLICT DO UPDATE ...', [summary]);

  res.json(result);
}
```

---

## 8. Fuentes oficiales

| Fuente | Artículo / URL | Uso en el sistema |
|---|---|---|
| LISR — Ley del ISR | Art. 27 | Requisitos formales de deducciones (bancarización ≥ $2,000, CFDI) |
| LISR — Ley del ISR | Art. 34 | Tasas anuales de deducción de inversiones |
| LISR — Ley del ISR | Art. 113-E | RESICO PF: tasa directa, límite $3.5M, exclusiones |
| LISR — Ley del ISR | Art. 115 | Deducciones autorizadas de arrendamiento + deducción ciega 35% |
| LISR — Ley del ISR | Arts. 103, 104, 105 | Deducciones de actividad empresarial y servicios profesionales |
| LISR — Ley del ISR | Art. 149 | Inversiones en bienes inmuebles (arrendamiento) |
| LISR — Ley del ISR | Art. 152 | Tarifa anual ISR personas físicas (11 tramos marginales) |
| LIVA — Ley del IVA | Art. 1 | Tasa general del IVA: 16% |
| LIVA — Ley del IVA | Arts. 15-IV, 15-IX, 15-XIII, 15-XIV | Categorías exentas de IVA (educación, seguros, funerarias, salud) |
| SAT — Deducciones personales | [sat.gob.mx/minisitio/DeduccionesPersonales](https://www.sat.gob.mx/minisitio/DeduccionesPersonales/index.html) | Tope global, reglas por categoría |
| SAT — Colegiaturas | [sat.gob.mx/minisitio/DeduccionesPersonales/colegiaturas](https://www.sat.gob.mx/minisitio/DeduccionesPersonales/colegiaturas.html) | Topes por nivel educativo |
| SAT — RESICO PF | [sat.gob.mx/portal/public/personas-fisicas/pf-simplificado-de-confianza](https://www.sat.gob.mx/portal/public/personas-fisicas/pf-simplificado-de-confianza) | Reglas de elegibilidad |
| SAT — Aviso de actualización | [wwwmat.sat.gob.mx/tramites/33758](https://wwwmat.sat.gob.mx/tramites/33758/presenta-el-aviso-de-actualizacion-de-actividades-economicas-y-obligaciones-fiscales-como-persona-fisica) | `requiresSATUpdateNotice` |
| SAT — Constancia de Situación Fiscal | [sat.gob.mx/aplicacion/53027](https://www.sat.gob.mx/aplicacion/53027/genera-tu-constancia-de-situacion-fiscal) | Fuente de `regimenesRegistradosSAT` |
| INEGI — UMA 2026 | [inegi.org.mx/.../uma2026.pdf](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf) | Valor $42,794.64 usado en múltiples topes |
| Cámara de Diputados — LISR completa | [diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf](https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf) | Referencia maestra del sistema |

---

*Documentación generada para ImpuMate — Core Algorithms. Ejercicio fiscal 2026.*
