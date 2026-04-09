# ImpuMate

> **Educación fiscal para la generación que trabaja distinto**  
> *Tax education for the generation that works differently*

[![Hackathon](https://img.shields.io/badge/Genius%20Arena%20Hackathon-2026-2D5016?style=flat-square)](https://www.talentland.mx/)
[![Track](https://img.shields.io/badge/Track-Banco%20Azteca%20%2F%20Grupo%20Salinas-B5E550?style=flat-square&labelColor=2D5016)](https://www.bancoazteca.com.mx/)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-61DAFB?style=flat-square)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](./LICENSE)

---

ImpuMate es una plataforma web de educación fiscal diseñada para personas físicas mexicanas de 18 a 29 años. Traduce la complejidad del sistema tributario mexicano —pensado históricamente para contadores— en tres preguntas simples con respuestas concretas y accionables.

*ImpuMate is a web-based tax education platform designed for Mexican individuals aged 18–29. It translates the complexity of Mexico's tax system—historically designed for accountants—into three simple questions with concrete, actionable answers.*

---

## Tabla de contenidos / Table of Contents

- [El problema](#-el-problema--the-problem)
- [La solución](#-la-solución--the-solution)
- [Módulos del sistema](#-módulos-del-sistema--system-modules)
- [Nueva funcionalidad](#-nueva-funcionalidad--new-feature)
- [Capas inteligentes](#-capas-inteligentes--intelligent-layers)
- [Stack tecnológico](#-stack-tecnológico--tech-stack)
- [Arquitectura](#-arquitectura--architecture)
- [Estructura del repositorio](#-estructura-del-repositorio--repository-structure)
- [Instalación y uso local](#-instalación-y-uso-local--local-setup)
- [Estado del prototipo](#-estado-del-prototipo--prototype-status)
- [Escalabilidad](#-escalabilidad--scalability)
- [Equipo](#-equipo--team)
- [Aviso legal](#-aviso-legal--legal-disclaimer)

---

## 🎯 El problema / The Problem

México tiene **más de 24 millones de jóvenes** entre 18 y 29 años con obligaciones fiscales ante el SAT: trabajan como freelancers, combinan nómina con servicios independientes, rentan inmuebles o cobran a través de plataformas digitales. El sistema tributario no fue diseñado para ellos.

*Mexico has more than 24 million young people aged 18–29 with active tax obligations. The tax system was not designed for them.*

| Indicador | Cifra |
|-----------|-------|
| Personas físicas registradas ante el SAT | **63.7 M** |
| Presentaron declaración anual en 2024 | **11.4 M** (17.9% del padrón) |
| No llevan ningún registro de gastos | **34.7%** de contribuyentes activos |

Sin orientación, un joven freelancer acumula una deuda fiscal silenciosa que descubre en abril: multas de hasta **$44,790 MXN** y recargos del **1.47% mensual**, sin haber tenido forma de saberlo con antelación.

*Without guidance, a young freelancer accumulates a silent tax debt discovered in April: fines up to $44,790 MXN and 1.47% monthly surcharges, with no way of knowing in advance.*

---

## 💡 La solución / The Solution

ImpuMate responde tres preguntas concretas:

1. **¿A qué régimen fiscal pertenezco** según mi actividad económica real?
2. **¿Qué gastos del día a día puedo deducir**, y en qué monto exacto?
3. **¿Cuánto debo apartar cada mes** para no tener sorpresas en mi declaración anual?

*ImpuMate answers three concrete questions: What tax regime do I belong to? What everyday expenses can I deduct, and in what exact amount? How much should I set aside each month?*

> **Principio fundamental:** Los tres módulos de ImpuMate son motores de reglas determinísticos: el mismo conjunto de datos produce siempre el mismo resultado, verificable contra la ley. La precisión de los cálculos nunca depende de IA generativa.
>
> *Core principle: ImpuMate's three modules are deterministic rule engines — the same input always produces the same output, verifiable against the law. Calculation accuracy never depends on generative AI.*

---

## ⚙️ Módulos del sistema / System Modules

### Módulo 1 — Identificador de Régimen Fiscal

Determina las obligaciones fiscales del usuario a partir de su realidad económica objetiva: quién le paga, si existe relación subordinada, si emite o recibe CFDI, si usa plataformas digitales como intermediarias. No parte del nombre que el usuario le da a su actividad, sino de los hechos.

Cubre todos los regímenes para personas físicas: Sueldos y Salarios, Actividad Empresarial (Régimen General), Servicios Profesionales (Régimen General), Arrendamiento y RESICO. Detecta obligaciones simultáneas en más de un régimen e identifica inconsistencias con el registro ante el SAT.

*Determines tax obligations from objective economic reality. Covers all regimes for individuals. Detects multiple simultaneous obligations and SAT inconsistencies.*

### Módulo 2 — Analizador de Deducibles

Evalúa cada gasto registrado y determina si es deducible, en qué monto exacto, y bajo qué condiciones formales (CFDI requerido, pago bancarizado para montos ≥ $2,000 MXN, factura a nombre del contribuyente, pago en el ejercicio fiscal correspondiente).

Cubre **25 categorías de gasto** en tres familias:

- **Deducciones personales:** gastos médicos, colegiaturas, seguros de gastos médicos, aportaciones al retiro, intereses hipotecarios, donativos, funerarios, lentes graduados
- **Gastos de actividad:** renta de oficina, equipo de cómputo, internet y teléfono, inventario, inversiones en activos fijos, IMSS, impuestos locales
- **Gastos de arrendamiento:** predial, mantenimiento, seguros, intereses, inversión en construcción

Incluye un **acumulador de deducciones** que aplica correctamente el tope global de deducciones personales: el menor entre 5 UMA anuales ($213,973 MXN en 2026) y el 15% del ingreso total.

*Evaluates each registered expense. Covers 25 expense categories across three families. Includes a deductions accumulator that correctly applies the global personal deductions cap.*

### Módulo 3 — Calculadora de Ahorro para Impuestos

A partir de las obligaciones del usuario y sus deducciones acumuladas, calcula:

- El **ISR retenido mensualmente** por el patrón y por el cliente (incluyendo la retención de persona moral cuando aplica)
- El **ISR anual** con base en la base gravable combinada de todas las fuentes de ingreso
- El **probable ajuste en la declaración anual** de abril
- El **IVA trasladado** y el **IVA retenido** (2/3 del total cuando el usuario presta servicios a una persona moral)
- El **saldo de IVA a enterar mensualmente** — el 1/3 restante, antes del día 17 de cada mes

El resultado es una sola cifra accionable: cuánto debe apartar el usuario cada mes. Una obligación fiscal difusa convertida en una disciplina financiera mensual concreta.

El módulo también señala algo que frecuentemente se pasa por alto: el dinero apartado para el ISR anual no se paga hasta abril y puede permanecer inactivo durante meses. Por eso, junto al resultado del buffer, la app presenta opciones de ahorro o inversión de corto plazo con liquidez suficiente para retirarlo cuando el SAT lo requiera — ampliar la visión del usuario sobre lo que puede hacer con su reserva fiscal mientras la acumula.

*Calculates monthly ISR withholdings (employer + client), annual ISR on combined taxable base, probable declaration adjustment, IVA transferred, IVA withheld (2/3 for persona moral clients), and monthly IVA balance to pay before the 17th. One actionable number: how much to set aside each month.*

---

## ✨ Nueva funcionalidad / New Feature

### Directorio de Proveedores Verificados

Integrado en el Módulo 2, el directorio lista profesionales y negocios con situación fiscal en regla y capacidad de emitir CFDI. El usuario lo consulta directamente desde la pantalla de registro de gastos.

**El problema que resuelve:** el principal freno para deducir gastos no es la falta de voluntad, es no saber dónde conseguir factura. ImpuMate cierra ese círculo: primero enseña qué se puede deducir, luego muestra dónde encontrarlo.

**Impacto en el uso:** genera tráfico recurrente —el usuario regresa cuando necesita médico, dentista o cualquier proveedor que emita factura— y sienta las bases para un modelo de alianzas con negocios y profesionales con potencial de monetización a futuro.

*Integrated into Module 2. Closes the loop: teaches what to deduct, then shows where to find it. Generates recurring traffic and creates a business partnership model.*

---

## 🤖 Capas inteligentes / Intelligent Layers

El diseño de ImpuMate contempla tres integraciones de tecnología inteligente alrededor del motor fiscal: extracción de datos desde lenguaje natural, lectura automatizada de facturas mediante OCR, y explicación de resultados en lenguaje natural. En los tres casos, la IA actúa como capa de comunicación, nunca como capa de cálculo.

**En el prototipo actual, estas capas están representadas mediante flujos simulados.** La decisión fue deliberada: el motor fiscal es la parte más compleja y de mayor valor del sistema. Garantizar su corrección end-to-end fue la prioridad del hackathon. Las integraciones de IA y OCR son capas de usabilidad que no afectan la precisión de los cálculos fiscales; validarlas correctamente requiere más tiempo del disponible en un hackathon.

*In the current prototype, AI layers are represented through simulated flows — a deliberate decision to prioritize correctness of the tax engine over usability layers that don't affect calculation accuracy.*

### Diseño para la siguiente fase / Design for the next phase

| Capa | Implementación planificada |
|------|---------------------------|
| **OCR + lectura de facturas** (Módulo 2) | Parser directo para XML CFDI 4.0; OCR + mapeo inteligente de campos para PDF. Confirmación obligatoria del usuario antes de evaluar. |
| **Reconocimiento de perfil** (Módulo 1) | El usuario describe su situación en texto libre. Un modelo extrae los campos estructurados en JSON. Campos ambiguos generan una aclaración puntual. |
| **Explicación de resultados** (Módulos 1–3) | El output del motor se entrega a un modelo de lenguaje que genera una explicación personalizada en segunda persona. El número no cambia: solo su presentación. |

La arquitectura acomoda estas integraciones como conexiones de entrada/salida al motor. Activarlas no requiere modificar ningún cálculo fiscal.

*The architecture accommodates these integrations as input/output connections to the engine. Enabling them requires no changes to any tax calculation.*

---

## 🛠 Stack tecnológico / Tech Stack

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Frontend** | React 18 + Vite | Iteración rápida; arquitectura escalable a móvil |
| **Backend / API** | Node.js + Express 5 | Reutiliza la misma lógica JS del motor sin reescritura |
| **Base de datos** | PostgreSQL 15 | Parámetros fiscales versionados por año — actualizar para 2027 es solo una inserción de filas |
| **Autenticación** | express-session + bcrypt | Sesiones stateful con hashing de contraseñas |
| **Seguridad** | helmet + CORS | Headers seguros, control de origen |
| **Motor fiscal** | JavaScript puro (sin dependencias externas) | Determinístico, testeable, auditable contra la ley |

---

## 🏗 Arquitectura / Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CAPA DE USUARIO                        │
│               React Web App (PWA)                         │
│  Registro de fuentes → Régimen → Gastos + Directorio      │
│                      → Buffer mensual                     │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP / REST
┌─────────────────────────▼────────────────────────────────┐
│                   CAPA DE LÓGICA                          │
│               Node.js + Express API                       │
│                                                           │
│  ┌─────────────┐   ┌─────────────┐   ┌───────────────┐   │
│  │  Módulo 1   │ → │  Módulo 2   │ → │   Módulo 3    │   │
│  │  Régimen    │   │  Deducibles │   │  Buffer fiscal│   │
│  └─────────────┘   └─────────────┘   └───────────────┘   │
│     Lógica determinística — mismo input, mismo output     │
└─────────────────────────┬────────────────────────────────┘
                          │ SQL
┌─────────────────────────▼────────────────────────────────┐
│                   CAPA DE DATOS                           │
│                    PostgreSQL                             │
│    Tarifa ISR · Tasas RESICO · UMA · Topes · Sesiones     │
└──────────────────────────────────────────────────────────┘
```

### Flujo de datos / Data Flow

```
Usuario registra fuentes de ingreso
        ↓
Módulo 1 — identifica obligaciones fiscales
        ↓
Usuario registra gastos (+ consulta directorio de proveedores)
        ↓
Módulo 2 — deducciones personales + de actividad + IVA acreditable
        ↓
Módulo 3 — ISR mensual · ajuste anual probable · IVA a pagar mensual
        ↓
Cifra mensual a apartar + orientación sobre el aprovechamiento del ahorro
```

---

## 📁 Estructura del repositorio / Repository Structure

```
ImpuMate/
│
├── integrated-algorithms/           # Motor fiscal (sin dependencias externas)
│   ├── src/
│   │   ├── constants/
│   │   │   ├── fiscalConstants.js   # Fuente única de verdad: tarifas ISR, UMA, topes 2026
│   │   │   └── taxCatalogs.js       # ENUMs: obligaciones, categorías de gasto, métodos de pago
│   │   ├── core/
│   │   │   └── deductionsAccumulator.js   # Estado acumulado entre evaluaciones
│   │   └── modules/
│   │       ├── taxRegimeIdentifier.js     # Módulo 1
│   │       ├── expenseDeductionAdvisor.js # Módulo 2
│   │       └── taxBufferCalculator.js     # Módulo 3
│   ├── db/
│   │   ├── schema.sql                     # Esquema PostgreSQL completo
│   │   └── seed_fiscal_parameters.sql     # Parámetros SAT 2026 sembrados
│   └── runner.js                          # Test runner (secciones A–D)
│
├── api/                             # Backend Node.js + Express
│   ├── src/
│   │   ├── controllers/             # Un controlador por recurso
│   │   ├── routes/                  # Endpoints REST
│   │   ├── services/                # Lógica de negocio + store
│   │   └── middlewares/             # Autenticación, manejo de errores
│   ├── build/
│   │   ├── setup-db.sh              # Inicialización de base de datos
│   │   └── test-endpoints.sh        # Suite de pruebas (5 casos por endpoint)
│   └── docs/
│       └── api-routes.md            # Referencia completa de endpoints
│
└── web/                             # Frontend React + Vite
    ├── src/
    │   ├── pages/
    │   │   ├── auth/                # Login, registro, perfil SAT
    │   │   ├── sessions/            # Gestión de sesiones fiscales
    │   │   ├── regime/              # Módulo 1: fuentes de ingreso
    │   │   ├── expenses/            # Módulo 2: gastos + directorio
    │   │   ├── buffer/              # Módulo 3: calculadora
    │   │   └── profile/             # Perfil y configuración
    │   ├── api/                     # Clientes HTTP por recurso
    │   └── components/              # UI components reutilizables
    └── public/
        └── manifest.json            # Configuración PWA
```

---

## 🚀 Instalación y uso local / Local Setup

### Prerrequisitos / Prerequisites

- Node.js ≥ 18
- PostgreSQL 15+

### 1. Clonar el repositorio / Clone

```bash
git clone https://github.com/equipo-dommie/impumate.git
cd impumate
```

### 2. Configurar la base de datos / Database setup

```bash
cd api
cp .env.example .env
# Editar .env con tus credenciales

bash build/setup-db.sh
# Para partir de cero: bash build/setup-db.sh --reset
```

Variables de entorno requeridas:

```env
DB_NAME=impumate_dev
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=tu_password
SESSION_SECRET=tu_secreto_de_sesion
PORT=3000
```

### 3. Iniciar el backend / Start backend

```bash
cd api
npm install
npm run dev        # Desarrollo con hot-reload
# npm start        # Producción
```

Verificar: `curl http://localhost:3000/health`

### 4. Iniciar el frontend / Start frontend

```bash
cd web
npm install
npm run dev
# Disponible en http://localhost:5173
```

### 5. Probar los endpoints / Test endpoints

```bash
cd api
bash build/test-endpoints.sh
bash build/test-endpoints.sh --verbose   # Con respuestas completas
```

### Flujo de uso recomendado / Recommended usage flow

```
1. POST /api/auth/register                             → Crear cuenta
2. PUT  /api/profile                                   → Completar perfil fiscal
3. POST /api/fiscal-sessions                           → Abrir sesión para 2026
4. POST /api/fiscal-sessions/:id/income-sources        → Agregar fuentes de ingreso
5. POST /api/fiscal-sessions/:id/regime/run            → Identificar régimen
6. GET  /api/fiscal-sessions/:id/deduction-catalog     → Ver qué puedo deducir
7. POST /api/fiscal-sessions/:id/expenses              → Registrar gastos
8. GET  /api/fiscal-sessions/:id/deductions/summary    → Resumen de deducibles
9. POST /api/fiscal-sessions/:id/tax-buffer/calculate  → Calcular buffer mensual
```

---

## 📊 Estado del prototipo / Prototype Status

El prototipo cubre el **happy path más común entre el público objetivo**: un usuario con dos fuentes de ingreso simultáneas — empleo formal con patrón (Sueldos y Salarios) y prestación de servicios independientes a una persona moral (Servicios Profesionales en Régimen General). Este escenario ilustra la complejidad de tener obligaciones en más de un régimen, retenciones parciales de ISR e IVA por parte del cliente, y la necesidad de calcular el ajuste probable en la declaración anual.

| Componente | Estado en el prototipo |
|------------|------------------------|
| **Motor — Módulo 1 (Régimen)** | Flujo completo para el happy path. La lógica de clasificación cubre los 9 tipos de obligación del catálogo. |
| **Motor — Módulo 2 (Deducibles)** | Las 25 categorías de gasto están modeladas. El acumulador del tope global opera correctamente. |
| **Motor — Módulo 3 (Buffer)** | ISR mensual (patrón + cliente), ISR anual ajustado, ajuste probable en declaración anual, IVA trasladado, IVA retenido (2/3), saldo mensual a enterar (1/3). |
| **Base de datos** | Parámetros fiscales 2026 sembrados: tarifa ISR marginal (Art. 152 LISR), tasas RESICO (Art. 113-E), valor UMA, topes de deducciones por categoría, márgenes de seguridad por régimen. |
| **API REST** | Nueve recursos con autenticación por sesión y suite de pruebas automatizadas. |
| **Frontend web** | Flujo completo: onboarding, sesiones fiscales, régimen, gastos, directorio, buffer. |
| **Directorio de proveedores** | Integrado en el Módulo 2. |
| **Capas inteligentes** | Diseñadas en la arquitectura; representadas con flujos simulados en el prototipo. |

> Los siguientes escenarios (RESICO, arrendamiento, plataformas) requieren extender la UI, no reescribir la lógica del motor.

---

## 📈 Escalabilidad / Scalability

**Cobertura de regímenes adicionales:** el motor fiscal ya tiene implementada la lógica para RESICO, arrendamiento, actividad empresarial y plataformas tecnológicas. La extensión es principalmente trabajo de UI.

**Integración de capas inteligentes:** OCR + parser CFDI, reconocimiento de perfil por lenguaje natural y explicación de resultados están diseñadas y listas para conectarse al motor. La arquitectura las acomoda sin modificar ningún cálculo.

**Directorio y alianzas:** base para un modelo de visibilidad con proveedores verificados, con potencial de monetización a futuro.

**Ahorro e integración con el sistema financiero:** el Módulo 3 ya sabe cuánto aparta el usuario y cuándo lo necesita pagar. El paso natural es orientarlo hacia instrumentos de ahorro de corto plazo que generen rendimientos sin comprometer la liquidez para el SAT. Esto abre líneas de colaboración con instituciones financieras — como Banco Azteca — cuyos productos encajen con ese perfil: alta liquidez, accesibilidad desde el celular y sin montos mínimos que excluyan a usuarios jóvenes con ingresos variables. Una colaboración así convertiría la reserva fiscal en un punto de entrada al ahorro formal para un segmento que históricamente ha estado fuera de él.

---

## 👥 Equipo / Team

**Equipo Dommie** — Genius Arena Hackathon 2026

| Integrante | Rol | GitHub |
|------------|-----|--------|
| **Andrés López Esquivel** | Backend / DB Lead | [@AndresLopezEsquivel](https://github.com/AndresLopezEsquivel) |
| **Daniel Mondragón Tapia** | AI Lead | [@danmondra](https://github.com/danmondra) |
| **Valentina León Hernández** | Frontend Lead | [@val3ntinahdz](https://github.com/val3ntinahdz) |

---

## ⚖️ Aviso legal / Legal Disclaimer

ImpuMate es una herramienta de **educación fiscal** y no constituye asesoría fiscal, legal ni contable. Los resultados se basan en reglas generales del SAT para el ejercicio 2026 y pueden no aplicar a situaciones específicas. Verificar siempre en [sat.gob.mx](https://www.sat.gob.mx) o consultar a un contador autorizado.

Parámetros fiscales implementados: tarifa ISR Art. 152 LISR, tasas RESICO Art. 113-E LISR, valor anual UMA $42,794.64 MXN (INEGI 2026), tope global de deducciones personales, colegiaturas por nivel educativo, tasas de deducción de inversiones Art. 34 LISR.

*ImpuMate is a tax education tool and does not constitute tax, legal, or accounting advice. Results are based on general SAT rules for the 2026 fiscal year. Always verify at sat.gob.mx or consult a certified public accountant.*

---

<div align="center">

**ImpuMate** · Genius Arena Hackathon 2026 · Track Banco Azteca / Grupo Salinas

*La asesoría fiscal de calidad es hoy un privilegio. ImpuMate la convierte en un derecho.*

</div>
