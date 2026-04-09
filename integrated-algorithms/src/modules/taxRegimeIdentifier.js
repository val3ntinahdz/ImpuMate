'use strict';

/**
 * taxRegimeIdentifier.js  (refactorizado)
 *
 * PROPÓSITO:
 * Identifica los regímenes y obligaciones fiscales probables de una persona
 * física en México, comparando su realidad económica declarada contra lo que
 * tiene registrado en el SAT.
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ORIGINAL:
 * ─────────────────────────────────────────
 * 1. Constantes movidas a src/constants/taxCatalogs.js
 *    Antes: BASE_CLASSIFICATION, OBLIGATION_CATEGORY, OFFICIAL_IDENTIFICATION_PARAMETERS definidos aquí
 *    Ahora: BASE_CLASSIFICATION, OBLIGATIONS, IDENTIFICATION_PARAMETERS importados desde taxCatalogs
 *
 * 2. OBLIGATION_CATEGORY → OBLIGATIONS
 *    El nombre se unificó con la convención del resto del sistema.
 *    Los valores string son idénticos — sin impacto en compatibilidad.
 *
 * 3. RESICO_MAX_ANNUAL_INCOME ya existía en FISCAL_CONSTANTS como
 *    RESICO_ANNUAL_INCOME_LIMIT_MXN. Ambos valen 3,500,000.
 *    Se usa IDENTIFICATION_PARAMETERS (que lo incluye) para mantener
 *    el contrato original de la función identifyTaxRegimesAndObligations.
 *
 * FUNCIONALIDAD: idéntica a la versión original.
 *
 * FUENTES OFICIALES:
 * - SAT personas físicas: https://www.sat.gob.mx/portal/public/personas-fisicas
 * - RESICO PF: https://www.sat.gob.mx/portal/public/personas-fisicas/pf-simplificado-de-confianza
 * - LISR art. 113-E: https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
 * - Aviso actualización: https://wwwmat.sat.gob.mx/tramites/33758/...
 */

const {
  OBLIGATIONS,
  BASE_CLASSIFICATION,
  IDENTIFICATION_PARAMETERS,
} = require('../constants/taxCatalogs');

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES GENERALES
// ─────────────────────────────────────────────────────────────────────────────

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function formatDateYYYYMMDD(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIONES DE ENTRADA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida el perfil fiscal mínimo del contribuyente.
 * @param {object} profile
 * @returns {string[]} mensajes de datos faltantes
 */
function validateProfileMinimum(profile) {
  const missing = [];

  if (isBlank(profile?.rfc))           missing.push('Falta RFC del usuario.');
  if (isBlank(profile?.nombreCompleto)) missing.push('Falta nombre completo del usuario.');

  if (!Array.isArray(profile?.regimenesRegistradosSAT))
    missing.push('Falta el arreglo regimenesRegistradosSAT.');

  if (!Array.isArray(profile?.obligacionesRegistradasSAT))
    missing.push('Falta el arreglo obligacionesRegistradasSAT.');

  return missing;
}

/**
 * Valida una fuente de ingreso individual.
 * @param {object} source
 * @returns {string[]} mensajes de datos faltantes
 */
function validateIncomeSourceMinimum(source) {
  const missing = [];

  if (isBlank(source?.idFuente))
    missing.push('La fuente de ingreso no tiene idFuente.');

  if (source?.montoAnualEstimadoSinIVA === null || source?.montoAnualEstimadoSinIVA === undefined)
    missing.push(`La fuente ${source?.idFuente ?? '(sin id)'} no informa montoAnualEstimadoSinIVA.`);

  if (isBlank(source?.quienPaga))
    missing.push(`La fuente ${source?.idFuente ?? '(sin id)'} no informa quienPaga.`);

  return missing;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASIFICACIÓN DE LA REALIDAD ECONÓMICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clasifica la naturaleza real del ingreso de una fuente.
 *
 * La clasificación se basa en la realidad económica, no en el nombre que el
 * usuario le da a su actividad. Reglas en orden de prioridad:
 * - Relación subordinada / CFDI de nómina → sueldos
 * - Uso o goce temporal de inmueble → arrendamiento
 * - Venta de bienes → actividad empresarial
 * - Servicios independientes → servicios profesionales
 * - Plataforma tecnológica como intermediario → plataformas
 *
 * @param {object} source
 * @returns {string} BASE_CLASSIFICATION value
 */
function classifyEconomicReality(source) {
  if (source?.existeRelacionSubordinada === true || source?.recibeCFDINomina === true)
    return BASE_CLASSIFICATION.SUELDOS_Y_SALARIOS;

  if (source?.otorgaUsoGoceTemporalInmueble === true)
    return BASE_CLASSIFICATION.ARRENDAMIENTO;

  if (source?.vendeBienes === true)
    return BASE_CLASSIFICATION.ACTIVIDAD_EMPRESARIAL;

  if (source?.prestaServiciosIndependientes === true)
    return BASE_CLASSIFICATION.SERVICIOS_PROFESIONALES;

  if (source?.usaPlataformaTecnologicaComoIntermediario === true)
    return BASE_CLASSIFICATION.PLATAFORMAS_TECNOLOGICAS;

  return BASE_CLASSIFICATION.NO_CLASIFICADA;
}

/**
 * Suma el ingreso anual estimado de todas las fuentes por cuenta propia.
 * Clave para RESICO: el límite de $3.5M se evalúa sobre el conjunto total,
 * no fuente por fuente.
 *
 * @param {object[]} incomeSources
 * @returns {number}
 */
function calculateEstimatedSelfEmploymentIncomeTotal(incomeSources) {
  return incomeSources.reduce((total, source) => {
    const baseClassification = classifyEconomicReality(source);

    const isSelfEmployment = [
      BASE_CLASSIFICATION.ACTIVIDAD_EMPRESARIAL,
      BASE_CLASSIFICATION.SERVICIOS_PROFESIONALES,
      BASE_CLASSIFICATION.ARRENDAMIENTO,
    ].includes(baseClassification);

    if (!isSelfEmployment) return total;
    return total + Number(source.montoAnualEstimadoSinIVA || 0);
  }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// ELEGIBILIDAD RESICO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decide si una fuente es POTENCIALMENTE elegible para RESICO.
 *
 * "Potencialmente elegible" ≠ que el SAT ya la tenga activa en RESICO.
 * Es una evaluación de condiciones previas basada en LISR art. 113-E.
 *
 * Exclusiones aplicadas:
 * - Actividad no es empresarial/profesional/arrendamiento
 * - Ingresos totales por cuenta propia > $3,500,000
 * - Socio o accionista de persona moral
 * - Residente extranjero con establecimiento permanente
 * - Percibe ingresos en régimen preferente (REFIPRE)
 * - Estado de cumplimiento SAT: INCUMPLIMIENTO
 *
 * @param {object} params
 * @returns {boolean}
 */
function isPotentiallyEligibleForRESICO({
  profile,
  source,
  baseClassification,
  estimatedSelfEmploymentIncomeTotal,
  parameters = IDENTIFICATION_PARAMETERS,
}) {
  const resicoEligibleClassifications = [
    BASE_CLASSIFICATION.ACTIVIDAD_EMPRESARIAL,
    BASE_CLASSIFICATION.SERVICIOS_PROFESIONALES,
    BASE_CLASSIFICATION.ARRENDAMIENTO,
  ];

  if (!resicoEligibleClassifications.includes(baseClassification)) return false;
  if (estimatedSelfEmploymentIncomeTotal > parameters.RESICO_MAX_ANNUAL_INCOME)  return false;
  if (profile?.esSocioAccionista === true)                                        return false;
  if (profile?.esResidenteExtranjeroConEstablecimientoPermanente === true)        return false;
  if (profile?.percibeIngresosRegimenPreferente === true)                         return false;
  if (normalizeText(profile?.estadoCumplimientoSAT) === 'INCUMPLIMIENTO')        return false;

  return true;
}

/**
 * Decide si, además de ser elegible, la app debe ASIGNAR RESICO en el output.
 *
 * RESICO es una opción de tributación. Se asigna automáticamente solo si:
 * - El SAT ya refleja RESICO en el perfil, o
 * - El usuario declaró expresamente que quiere tributar ahí, o
 * - El perfil tiene preferencia global de RESICO activa.
 *
 * @param {object} profile
 * @param {object} source
 * @param {boolean} eligibleForRESICO
 * @returns {boolean}
 */
function shouldAssignRESICO(profile, source, eligibleForRESICO) {
  if (!eligibleForRESICO) return false;

  const registeredText = [
    ...(profile?.regimenesRegistradosSAT   || []),
    ...(profile?.obligacionesRegistradasSAT || []),
  ]
    .map(normalizeText)
    .join(' ');

  if (registeredText.includes('RESICO'))              return true;
  if (source?.solicitaTributarEnRESICO === true)      return true;
  if (profile?.preferirRESICOEnFuentesElegibles === true) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DE OBLIGACIONES FISCALES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construye el objeto de obligación fiscal a partir de la clasificación
 * y la decisión RESICO.
 *
 * @param {object} source
 * @param {string} baseClassification
 * @param {boolean} assignRESICO
 * @returns {object} obligation
 */
function buildObligationFromClassification(source, baseClassification, assignRESICO) {
  const obligation = {
    idObligacion:           `OBL_${source.idFuente}`,
    idFuenteIngreso:        source.idFuente,
    categoriaFiscal:        OBLIGATIONS.NO_DETERMINADA,
    impuestosAplicables:    [],
    periodicidadISR:        'NO_DETERMINADA',
    periodicidadIVA:        'NO_DETERMINADA',
    requiereDeclaracionAnual: false,
    datosMinimosFaltantes:  [],
    motivoDeteccion:        '',
  };

  switch (baseClassification) {
    case BASE_CLASSIFICATION.SUELDOS_Y_SALARIOS:
      obligation.categoriaFiscal       = OBLIGATIONS.SUELDOS_Y_SALARIOS;
      obligation.impuestosAplicables    = ['ISR'];
      obligation.periodicidadISR        = 'RETENCION_NOMINA';
      obligation.periodicidadIVA        = 'NO_APLICA';
      obligation.requiereDeclaracionAnual = true;
      obligation.motivoDeteccion        = 'Se detectó relación subordinada o CFDI de nómina.';
      return obligation;

    case BASE_CLASSIFICATION.ACTIVIDAD_EMPRESARIAL:
      obligation.categoriaFiscal        = assignRESICO
        ? OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_RESICO
        : OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL;
      obligation.impuestosAplicables    = ['ISR', 'IVA'];
      obligation.periodicidadISR        = 'MENSUAL';
      obligation.periodicidadIVA        = 'MENSUAL';
      obligation.requiereDeclaracionAnual = true;
      obligation.motivoDeteccion        = 'Se detectó venta de bienes o negocio por cuenta propia.';
      return obligation;

    case BASE_CLASSIFICATION.SERVICIOS_PROFESIONALES:
      obligation.categoriaFiscal        = assignRESICO
        ? OBLIGATIONS.SERVICIOS_PROFESIONALES_RESICO
        : OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL;
      obligation.impuestosAplicables    = ['ISR', 'IVA'];
      obligation.periodicidadISR        = 'MENSUAL';
      obligation.periodicidadIVA        = 'MENSUAL';
      obligation.requiereDeclaracionAnual = true;
      obligation.motivoDeteccion        = 'Se detectó prestación de servicios independientes.';
      return obligation;

    case BASE_CLASSIFICATION.ARRENDAMIENTO:
      obligation.categoriaFiscal        = assignRESICO
        ? OBLIGATIONS.ARRENDAMIENTO_RESICO
        : OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL;
      obligation.impuestosAplicables    = ['ISR', 'IVA'];
      obligation.periodicidadISR        = 'MENSUAL';
      obligation.periodicidadIVA        = 'MENSUAL';
      obligation.requiereDeclaracionAnual = true;
      obligation.motivoDeteccion        = 'Se detectó ingreso por uso o goce temporal de inmueble.';
      return obligation;

    case BASE_CLASSIFICATION.PLATAFORMAS_TECNOLOGICAS:
      obligation.categoriaFiscal        = OBLIGATIONS.REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS;
      obligation.impuestosAplicables    = [];
      obligation.periodicidadISR        = 'POR_DETERMINAR';
      obligation.periodicidadIVA        = 'POR_DETERMINAR';
      obligation.requiereDeclaracionAnual = true;
      obligation.motivoDeteccion        = 'La fuente usa plataforma tecnológica; conviene derivarla a un módulo especializado.';
      return obligation;

    default:
      obligation.categoriaFiscal        = OBLIGATIONS.NO_DETERMINADA;
      obligation.motivoDeteccion        = 'No se pudo clasificar automáticamente la fuente.';
      obligation.datosMinimosFaltantes.push('La fuente requiere revisión manual.');
      return obligation;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSISTENCIA CON EL SAT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta si la obligación identificada NO coincide con lo registrado en SAT.
 * Usa comparación por familias lógicas, no texto exacto.
 *
 * Si hay inconsistencia → el usuario probablemente necesita presentar un aviso
 * de actualización de actividades y obligaciones.
 *
 * @param {object} obligation
 * @param {object} profile
 * @returns {boolean} true si hay inconsistencia
 */
function hasSATInconsistency(obligation, profile) {
  const registeredText = [
    ...(profile?.regimenesRegistradosSAT   || []),
    ...(profile?.obligacionesRegistradasSAT || []),
  ]
    .map(normalizeText)
    .join(' ');

  const category = normalizeText(obligation.categoriaFiscal);

  if (category.includes('SUELDOS')              && registeredText.includes('SUELDOS'))      return false;
  if (category.includes('SERVICIOS_PROFESIONALES') && registeredText.includes('PROFESION')) return false;
  if (category.includes('ACTIVIDAD_EMPRESARIAL') && registeredText.includes('EMPRESARIAL')) return false;
  if (category.includes('ARRENDAMIENTO')         && registeredText.includes('ARRENDAMIENTO')) return false;
  if (category.includes('RESICO')               && registeredText.includes('RESICO'))       return false;
  if (category.includes('PLATAFORMAS')          && registeredText.includes('PLATAFORMA'))   return false;

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUMEN EJECUTIVO Y PASOS SIGUIENTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera el resumen de alto nivel para UI o debugging.
 * @param {object[]} obligations
 * @returns {object}
 */
function buildExecutiveSummary(obligations) {
  const hasMultiple      = obligations.length > 1;
  const hasRESICO        = obligations.some((o) => normalizeText(o.categoriaFiscal).includes('RESICO'));
  const hasPayroll       = obligations.some((o) => o.categoriaFiscal === OBLIGATIONS.SUELDOS_Y_SALARIOS);
  const hasSelfEmployment= obligations.some((o) =>
    [
      OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_REGIMEN_GENERAL,
      OBLIGATIONS.SERVICIOS_PROFESIONALES_REGIMEN_GENERAL,
      OBLIGATIONS.ARRENDAMIENTO_REGIMEN_GENERAL,
      OBLIGATIONS.ACTIVIDAD_EMPRESARIAL_RESICO,
      OBLIGATIONS.SERVICIOS_PROFESIONALES_RESICO,
      OBLIGATIONS.ARRENDAMIENTO_RESICO,
    ].includes(o.categoriaFiscal),
  );

  return {
    totalObligaciones:           obligations.length,
    tieneMultiplesObligaciones:  hasMultiple,
    tieneRESICO:                 hasRESICO,
    tieneSueldos:                hasPayroll,
    tieneActividadPorCuentaPropia: hasSelfEmployment,
  };
}

/**
 * Genera los pasos operativos recomendados al usuario.
 * @param {object} result
 * @returns {string[]}
 */
function buildRecommendedNextSteps(result) {
  const steps = [];

  if (result.requiresSATUpdateNotice) {
    steps.push(
      'Revisar la Constancia de Situación Fiscal y, si la realidad económica cambió, ' +
      'presentar aviso de actualización de actividades y obligaciones dentro del mes siguiente al cambio. ' +
      'Fuente: https://wwwmat.sat.gob.mx/tramites/33758/',
    );
  }

  if (result.globalMissingData.length > 0) {
    steps.push(
      'Solicitar al usuario los datos faltantes antes de calcular impuestos: ' +
      'montos, CFDI, tipo de pagador, retenciones y tratamiento de IVA.',
    );
  }

  if (result.obligationsDetected.some(
    (o) => o.categoriaFiscal === OBLIGATIONS.REQUIERE_MODULO_ESPECIALIZADO_PLATAFORMAS,
  )) {
    steps.push('Enviar la fuente a un módulo especializado de plataformas tecnológicas.');
  }

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * identifyTaxRegimesAndObligations
 *
 * Algoritmo principal de identificación de régimen fiscal.
 *
 * ENTRADAS:
 *   profile       {object}   — datos fiscales del contribuyente (RFC, regímenes SAT, etc.)
 *   incomeSources {object[]} — fuentes de ingreso declaradas por el usuario
 *   options       {object}   — opcionales: parameters (override), today (fecha referencia)
 *
 * SALIDA:
 * {
 *   obligationsDetected:    object[]  — obligaciones fiscales identificadas
 *   inconsistencyAlerts:    string[]  — discrepancias vs. lo registrado en SAT
 *   globalMissingData:      string[]  — datos que faltan para mayor precisión
 *   requiresSATUpdateNotice: boolean  — ¿necesita presentar aviso de actualización?
 *   executiveSummary:       object    — resumen de alto nivel para UI
 *   recommendedNextSteps:   string[]  — pasos operativos recomendados
 *   diagnostics:            object    — metadata del cálculo
 * }
 *
 * @param {object}   profile
 * @param {object[]} incomeSources
 * @param {object}   options
 * @returns {object}
 */
function identifyTaxRegimesAndObligations(profile, incomeSources, options = {}) {
  const parameters = options.parameters || IDENTIFICATION_PARAMETERS;
  const today      = options.today      || new Date();

  const globalMissingData  = [...validateProfileMinimum(profile)];
  const obligationsDetected= [];
  const inconsistencyAlerts= [];

  const estimatedSelfEmploymentIncomeTotal = calculateEstimatedSelfEmploymentIncomeTotal(
    incomeSources || [],
  );

  for (const source of incomeSources || []) {
    const sourceMissingData  = validateIncomeSourceMinimum(source);
    globalMissingData.push(...sourceMissingData);

    const baseClassification = classifyEconomicReality(source);

    const eligibleForRESICO  = isPotentiallyEligibleForRESICO({
      profile,
      source,
      baseClassification,
      estimatedSelfEmploymentIncomeTotal,
      parameters,
    });

    const assignRESICO       = shouldAssignRESICO(profile, source, eligibleForRESICO);

    const obligation         = buildObligationFromClassification(source, baseClassification, assignRESICO);
    obligation.datosMinimosFaltantes.push(...sourceMissingData);

    obligationsDetected.push(obligation);

    if (hasSATInconsistency(obligation, profile)) {
      inconsistencyAlerts.push(
        `La obligación detectada "${obligation.categoriaFiscal}" no coincide claramente con lo registrado en SAT.`,
      );
    }
  }

  const requiresSATUpdateNotice = inconsistencyAlerts.length > 0;

  const result = {
    obligationsDetected,
    inconsistencyAlerts,
    globalMissingData,
    requiresSATUpdateNotice,
    executiveSummary:     buildExecutiveSummary(obligationsDetected),
    recommendedNextSteps: [],
    diagnostics: {
      estimatedSelfEmploymentIncomeTotal,
      evaluatedAt:             formatDateYYYYMMDD(today),
      officialParametersUsed:  parameters,
    },
  };

  result.recommendedNextSteps = buildRecommendedNextSteps(result);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  identifyTaxRegimesAndObligations,
  // auxiliares exportados para testing unitario
  classifyEconomicReality,
  calculateEstimatedSelfEmploymentIncomeTotal,
  isPotentiallyEligibleForRESICO,
  shouldAssignRESICO,
  buildObligationFromClassification,
  hasSATInconsistency,
  buildExecutiveSummary,
  validateProfileMinimum,
  validateIncomeSourceMinimum,
};
