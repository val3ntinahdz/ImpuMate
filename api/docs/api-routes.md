# ImpuMate API — Guía de Rutas para Desarrolladores

**Base URL:** `http://localhost:3000`
**Autenticación:** Sesiones HTTP (cookie `connect.sid`)
**Content-Type:** `application/json`

---

## Flujo recomendado para probar la API

```
1. POST /api/auth/register       → crear cuenta
2. POST /api/auth/login          → iniciar sesión (guarda cookie automáticamente)
3. PUT  /api/profile             → actualizar perfil fiscal (RFC, flags)
4. POST /api/fiscal-sessions     → abrir sesión fiscal con año
5a. POST /api/fiscal-sessions/:id/income-sources   → agregar fuentes de ingreso
5b. POST /api/fiscal-sessions/:id/regime/run       → identificar régimen (o /select si ya lo sabes)
6.  GET  /api/fiscal-sessions/:id/regime/obligations → verificar obligaciones activas
7.  GET  /api/fiscal-sessions/:id/deduction-catalog  → ver catálogo de deducciones
8.  POST /api/fiscal-sessions/:id/expenses           → registrar gastos
9.  GET  /api/fiscal-sessions/:id/deductions/summary → ver acumulador de deducciones
10. POST /api/fiscal-sessions/:id/tax-buffer/calculate → calcular buffer mensual
```

---

## AUTH

### POST /api/auth/register
Crea una cuenta nueva e inicia sesión automáticamente.

**Body:**
```json
{
  "email": "sofia@example.com",
  "password": "MiPassword123",
  "rfc": "RAMS900101ABC",
  "nombreCompleto": "Sofía Ramírez"
}
```

**Respuesta 201:**
```json
{
  "id": "1750000000000-1",
  "email": "sofia@example.com",
  "rfc": "RAMS900101ABC",
  "nombreCompleto": "Sofía Ramírez"
}
```

---

### POST /api/auth/login

**Body:**
```json
{
  "email": "sofia@example.com",
  "password": "MiPassword123"
}
```

---

### POST /api/auth/logout
Sin body. Destruye la sesión y limpia la cookie.

---

## PROFILE

### GET /api/profile
Devuelve el perfil completo del usuario autenticado (sin `passwordHash`).

---

### PUT /api/profile
Actualiza campos del perfil fiscal.

**Body (todos opcionales):**
```json
{
  "rfc": "RAMS900101ABC",
  "nombreCompleto": "Sofía Ramírez Mendoza",
  "esSocioAccionista": false,
  "esResidenteExtranjeroConEP": false,
  "prefiereResico": false,
  "usesBlindRentalDeduction": false,
  "estadoCumplimientoSat": "AL_CORRIENTE"
}
```

---

### GET /api/profile/sat-regimes
Devuelve los regímenes registrados ante el SAT.

### PUT /api/profile/sat-regimes
**Body:**
```json
{ "satRegimes": ["Régimen de Actividades Empresariales y Profesionales"] }
```

### GET /api/profile/sat-obligations
### PUT /api/profile/sat-obligations
**Body:**
```json
{ "satObligations": ["Pago provisional ISR", "Declaración IVA mensual"] }
```

---

## FISCAL SESSIONS

### POST /api/fiscal-sessions
Abre una sesión fiscal para un año específico.

**Body:**
```json
{
  "exerciseYear": 2026,
  "isrAlreadyWithheldMxn": 0,
  "ivaAlreadyPaidMxn": 0,
  "bufferHorizonMonths": 3
}
```

**Respuesta 201:**
```json
{
  "id": "1750000000001-2",
  "userId": "...",
  "exerciseYear": 2026,
  "bufferHorizonMonths": 3,
  "isrAlreadyWithheldMxn": 0,
  "ivaAlreadyPaidMxn": 0,
  "createdAt": "2026-03-14T..."
}
```

---

### GET /api/fiscal-sessions
Lista todas las sesiones del usuario.

### GET /api/fiscal-sessions/:sessionId
Detalle de una sesión.

### PUT /api/fiscal-sessions/:sessionId
Actualiza parámetros de la sesión.

**Body (todos opcionales):**
```json
{
  "isrAlreadyWithheldMxn": 24000,
  "ivaAlreadyPaidMxn": 4800,
  "bufferHorizonMonths": 6
}
```

### DELETE /api/fiscal-sessions/:sessionId
Elimina la sesión y todos sus datos asociados en memoria.

---

## INCOME SOURCES

Todas las rutas requieren `:sessionId` válido y perteneciente al usuario autenticado.

### POST /api/fiscal-sessions/:sessionId/income-sources
Agrega una fuente de ingreso a la sesión.

**Body:**
```json
{
  "idFuente": "freelance-001",
  "descripcion": "Servicios de diseño gráfico",
  "montoAnualEstimado": 180000,
  "quienPaga": "Clientes directos",
  "existeRelacionSubordinada": false,
  "recibeCfdiNomina": false,
  "vendeBienes": false,
  "prestaSErvcioIndependiente": true,
  "otorgaUsoGoceInmueble": false,
  "usaPlataformaTecnologica": false,
  "isSubjectToIva": true,
  "solicitaTributarEnResico": false
}
```

### GET /api/fiscal-sessions/:sessionId/income-sources
Lista las fuentes de ingreso de la sesión.

### PUT /api/fiscal-sessions/:sessionId/income-sources/:sourceId
Actualiza una fuente de ingreso (acepta los mismos campos del POST).

### DELETE /api/fiscal-sessions/:sessionId/income-sources/:sourceId

---

## REGIME

### POST /api/fiscal-sessions/:sessionId/regime/run
Ejecuta el algoritmo `taxRegimeIdentifier` con las fuentes de ingreso de la sesión.
Se puede ejecutar múltiples veces. Sobrescribe el resultado anterior.

**Body:** *(opcional)* — flags adicionales del perfil fiscal.
```json
{
  "profile": {
    "esSocioAccionista": false
  }
}
```

**Respuesta:** resultado completo del `taxRegimeIdentifier`:
```json
{
  "obligationsDetected": [...],
  "inconsistencyAlerts": [],
  "globalMissingData": [],
  "requiresSATUpdateNotice": false,
  "executiveSummary": {
    "totalObligaciones": 1,
    "tieneRESICO": false,
    "tieneSueldos": false,
    "tieneActividadPorCuentaPropia": true
  },
  "recommendedNextSteps": [...],
  "diagnostics": {...}
}
```

---

### POST /api/fiscal-sessions/:sessionId/regime/select
Asigna obligaciones manualmente (para usuarios que ya conocen su régimen).

**Body:**
```json
{
  "obligations": ["SERVICIOS_PROFESIONALES_REGIMEN_GENERAL"]
}
```

**Valores válidos para `obligations`:**
- `SUELDOS_Y_SALARIOS`
- `ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL`
- `SERVICIOS_PROFESIONALES_REGIMEN_GENERAL`
- `ARRENDAMIENTO_REGIMEN_GENERAL`
- `ACTIVIDAD_EMPRESARIAL_RESICO`
- `SERVICIOS_PROFESIONALES_RESICO`
- `ARRENDAMIENTO_RESICO`

---

### GET /api/fiscal-sessions/:sessionId/regime/results
Devuelve el último resultado guardado (ya sea de `/run` o `/select`).

### GET /api/fiscal-sessions/:sessionId/regime/obligations
Devuelve únicamente el arreglo de obligaciones activas de la sesión.

```json
{ "obligations": ["SERVICIOS_PROFESIONALES_REGIMEN_GENERAL"] }
```

---

## DEDUCTION CATALOG

### GET /api/fiscal-sessions/:sessionId/deduction-catalog
Devuelve el catálogo de deducciones disponibles según las obligaciones activas.
Útil para mostrar al usuario qué puede deducir antes de registrar gastos.

**Respuesta:**
```json
{
  "obligations": ["SERVICIOS_PROFESIONALES_REGIMEN_GENERAL"],
  "catalog": [
    { "family": "PERSONAL_DEDUCTIONS", "item": "Gastos médicos y hospitalarios", "rule": "..." },
    { "family": "BUSINESS_DEDUCTIONS_ISR", "item": "Gastos necesarios para la actividad", "rule": "..." }
  ]
}
```

---

## EXPENSES

### POST /api/fiscal-sessions/:sessionId/expenses
Registra un gasto. Evalúa su deducibilidad automáticamente y recalcula el acumulador.

**Body — ejemplo gasto médico:**
```json
{
  "category": "PERSONAL_MEDICAL",
  "amountMXN": 12000,
  "paymentMethod": "CREDIT_CARD",
  "hasCFDI": true,
  "invoiceReceiverRFCMatchesTaxpayer": true,
  "paidFromTaxpayerAccount": true,
  "paidInRelevantFiscalYear": true,
  "beneficiaryRelationship": "SELF",
  "providerHasRequiredProfessionalLicense": true
}
```

**Body — ejemplo inversión (laptop):**
```json
{
  "category": "BUSINESS_INVESTMENT",
  "amountMXN": 25000,
  "paymentMethod": "TRANSFER",
  "hasCFDI": true,
  "invoiceReceiverRFCMatchesTaxpayer": true,
  "isStrictlyIndispensableForActivity": true,
  "assetType": "COMPUTER_EQUIPMENT"
}
```

**Body — ejemplo gasto de actividad:**
```json
{
  "category": "BUSINESS_OFFICE_RENT",
  "amountMXN": 8000,
  "paymentMethod": "TRANSFER",
  "hasCFDI": true,
  "invoiceReceiverRFCMatchesTaxpayer": true,
  "isActuallyPaid": true,
  "isStrictlyIndispensableForActivity": true
}
```

**Respuesta 201:**
```json
{
  "expense": { "id": "...", "category": "PERSONAL_MEDICAL", "amountMXN": 12000, ... },
  "accumulatorSnapshot": {
    "totalPersonalDeductiblesMxn": 12000,
    "totalActivityDeductiblesMxn": 0,
    "totalIvaAcreditableMxn": 0,
    "approvedCount": 1,
    "rejectedCount": 0,
    ...
  }
}
```

### GET /api/fiscal-sessions/:sessionId/expenses
Lista todos los gastos con sus resultados de evaluación.

### GET /api/fiscal-sessions/:sessionId/expenses/:expenseId
Detalle de un gasto.

### PUT /api/fiscal-sessions/:sessionId/expenses/:expenseId
Edita el gasto y recalcula el acumulador completo.

### DELETE /api/fiscal-sessions/:sessionId/expenses/:expenseId
Elimina el gasto y recalcula el acumulador completo.

---

## DEDUCTIONS SUMMARY

### GET /api/fiscal-sessions/:sessionId/deductions/summary
Devuelve el snapshot actual del acumulador de deducciones.

**Respuesta:**
```json
{
  "totalPersonalDeductiblesMxn": 12000,
  "totalActivityDeductiblesMxn": 19200,
  "totalIvaAcreditableMxn": 3072,
  "totalDeductiblesMxn": 31200,
  "approvedCount": 3,
  "rejectedCount": 0,
  "approvedExpenses": [...],
  "rejectedExpenses": [],
  "lastRecalculatedAt": "2026-03-14T..."
}
```

---

## TAX BUFFER

### POST /api/fiscal-sessions/:sessionId/tax-buffer/calculate
Calcula el buffer fiscal mensual bajo demanda. Usa el estado actual del acumulador
y las fuentes de ingreso de la sesión.

**Body:** Sin body requerido. Los parámetros se leen de la sesión fiscal.

**Respuesta:**
```json
{
  "recommendedMonthlyBuffer": 42298.46,
  "estimatedISRByObligation": {
    "SERVICIOS_PROFESIONALES_REGIMEN_GENERAL": 15192.72
  },
  "estimatedIVACausado": 28800,
  "estimatedIVAAcreditable": 3072,
  "estimatedIVAOwed": 20928,
  "totalTaxLiability": 36120.72,
  "totalWithSafetyMargin": 42298.46,
  "bufferHorizonMonths": 3,
  "reasoning": ["[1] Ingresos brutos...", "[2] Deducciones..."],
  "warnings": [],
  "disclaimer": "Esta información es educativa..."
}
```

### GET /api/fiscal-sessions/:sessionId/tax-buffer/latest
Devuelve el último resultado de buffer calculado para la sesión.

---

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200    | OK |
| 201    | Recurso creado |
| 400    | Datos faltantes o inválidos |
| 401    | No autenticado |
| 404    | Recurso no encontrado |
| 409    | Conflicto (ej. sesión fiscal duplicada) |
| 500    | Error interno |

---

## Probar con curl

```bash
# 1. Registrar usuario
curl -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"sofia@example.com","password":"MiPassword123","rfc":"RAMS900101ABC","nombreCompleto":"Sofía Ramírez"}'

# 2. Abrir sesión fiscal
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/fiscal-sessions \
  -H "Content-Type: application/json" \
  -d '{"exerciseYear":2026,"bufferHorizonMonths":3}'

# 3. Agregar fuente de ingreso (reemplaza SESSION_ID con el id devuelto)
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/fiscal-sessions/SESSION_ID/income-sources \
  -H "Content-Type: application/json" \
  -d '{"idFuente":"srv-001","montoAnualEstimado":180000,"quienPaga":"Clientes","prestaSErvcioIndependiente":true,"isSubjectToIva":true}'

# 4. Asignar régimen manualmente
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/fiscal-sessions/SESSION_ID/regime/select \
  -H "Content-Type: application/json" \
  -d '{"obligations":["SERVICIOS_PROFESIONALES_REGIMEN_GENERAL"]}'

# 5. Registrar un gasto
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/fiscal-sessions/SESSION_ID/expenses \
  -H "Content-Type: application/json" \
  -d '{"category":"PERSONAL_MEDICAL","amountMXN":12000,"paymentMethod":"CREDIT_CARD","hasCFDI":true,"invoiceReceiverRFCMatchesTaxpayer":true,"paidFromTaxpayerAccount":true,"paidInRelevantFiscalYear":true,"beneficiaryRelationship":"SELF","providerHasRequiredProfessionalLicense":true}'

# 6. Calcular buffer
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/fiscal-sessions/SESSION_ID/tax-buffer/calculate \
  -H "Content-Type: application/json"
```
