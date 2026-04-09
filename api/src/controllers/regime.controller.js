'use strict';

const { fiscalSessions, incomeSources, regimeResults, users } = require('../services/inMemoryStore');
const { identifyTaxRegimesAndObligations } = require('../../../integrated-algorithms/src/modules/taxRegimeIdentifier');

function buildManualExecutiveSummary(obligations) {
  const obligationSet = new Set(obligations || []);
  return {
    totalObligaciones: obligationSet.size,
    tieneRESICO: [...obligationSet].some(obl => obl.includes('RESICO')),
    tieneSueldos: obligationSet.has('SUELDOS_Y_SALARIOS'),
    tieneActividadPorCuentaPropia: [...obligationSet].some(obl =>
      obl.includes('ACTIVIDAD_EMPRESARIAL') ||
      obl.includes('SERVICIOS_PROFESIONALES') ||
      obl.includes('ARRENDAMIENTO'),
    ),
  };
}

function normalizeRegimeResult(result) {
  if (!result) return null;

  if (result.type === 'algorithm') {
    return {
      ...result.result,
      sourceType: 'algorithm',
    };
  }

  if (result.type === 'manual') {
    const obligations = result.obligations || [];
    return {
      obligationsDetected: obligations.map(categoriaFiscal => ({ categoriaFiscal })),
      inconsistencyAlerts: [],
      globalMissingData: [],
      requiresSATUpdateNotice: false,
      executiveSummary: buildManualExecutiveSummary(obligations),
      recommendedNextSteps: [],
      diagnostics: {
        inputMethod: 'manual',
      },
      sourceType: 'manual',
    };
  }

  return result;
}

function buildAlgorithmFiscalProfile(user, profileOverrides = {}) {
  const baseProfile = {
    rfc: user.rfc,
    nombreCompleto: user.nombreCompleto,
    regimenesRegistradosSAT: user.satRegimes || [],
    obligacionesRegistradasSAT: user.satObligations || [],
    esSocioAccionista: user.esSocioAccionista ?? false,
    esResidenteExtranjeroConEP: user.esResidenteExtranjeroConEP ?? false,
    prefiereResico: user.prefiereResico ?? false,
    estadoCumplimientoSat: user.estadoCumplimientoSat || 'AL_CORRIENTE',
    ...profileOverrides,
  };

  return {
    rfc: baseProfile.rfc,
    nombreCompleto: baseProfile.nombreCompleto,
    regimenesRegistradosSAT: baseProfile.regimenesRegistradosSAT || [],
    obligacionesRegistradasSAT: baseProfile.obligacionesRegistradasSAT || [],
    esSocioAccionista: baseProfile.esSocioAccionista ?? false,
    esResidenteExtranjeroConEstablecimientoPermanente: baseProfile.esResidenteExtranjeroConEP ?? false,
    preferirRESICOEnFuentesElegibles: baseProfile.prefiereResico ?? false,
    estadoCumplimientoSAT: baseProfile.estadoCumplimientoSat || 'AL_CORRIENTE',
  };
}

function buildAlgorithmSources(sources) {
  return (sources || []).map((source) => ({
    idFuente: source.idFuente,
    descripcion: source.descripcion,
    tipoEconomico: source.tipoEconomico,
    montoAnualEstimadoSinIVA: source.montoAnualEstimado,
    quienPaga: source.quienPaga,
    existeRelacionSubordinada: source.existeRelacionSubordinada ?? false,
    recibeCFDINomina: source.recibeCfdiNomina ?? false,
    vendeBienes: source.vendeBienes ?? false,
    prestaServiciosIndependientes: source.prestaSErvcioIndependiente ?? false,
    otorgaUsoGoceTemporalInmueble: source.otorgaUsoGoceInmueble ?? false,
    usaPlataformaTecnologicaComoIntermediario: source.usaPlataformaTecnologica ?? false,
    isSubjectToIva: source.isSubjectToIva ?? false,
    // Decision de producto: RESICO se gobierna solo desde el perfil global.
    solicitaTributarEnRESICO: false,
  }));
}

async function requireSession(req, res) {
  const s = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
  if (!s) { res.status(404).json({ error: 'Sesión no encontrada.' }); return null; }
  return s;
}

// Path 2: run the RegimeIdentifier algorithm (can be called N times)
async function runRegimeIdentifier(req, res, next) {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const sources = await incomeSources.findBySession(req.params.sessionId);
    if (!sources.length) {
      return res.status(400).json({ error: 'Agrega al menos una fuente de ingreso antes de identificar tu régimen.' });
    }

    const { profile } = req.body; // optional extra profile flags from request body
    const { users } = require('../services/inMemoryStore');
    const user = await users.findById(req.session.userId);

    const fiscalProfile = buildAlgorithmFiscalProfile(user, profile);
    const adaptedSources = buildAlgorithmSources(sources);

    console.log("== runRegimeIdentifier ==");
    console.log("fiscalProfile = ", fiscalProfile);
    console.log("sources = ", adaptedSources);

    const result = identifyTaxRegimesAndObligations(fiscalProfile, adaptedSources);

    await regimeResults.save(req.params.sessionId, { type: 'algorithm', result });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Path 1: user already knows their regime — manually assign obligations
async function selectObligationsManually(req, res) {
  const session = await requireSession(req, res);
  if (!session) return;

  const { obligations } = req.body;
  if (!Array.isArray(obligations) || !obligations.length) {
    return res.status(400).json({ error: 'obligations debe ser un arreglo con al menos una obligación.' });
  }

  await regimeResults.save(req.params.sessionId, { type: 'manual', obligations });

  res.json({ message: 'Obligaciones asignadas manualmente.', obligations });
}

async function getRegimeResults(req, res) {
  if (!await requireSession(req, res)) return;
  const result = await regimeResults.findBySession(req.params.sessionId);
  if (!result) return res.status(404).json({ error: 'Aún no se ha ejecutado la identificación de régimen.' });
  res.json(normalizeRegimeResult(result));
}

async function getActiveObligations(req, res) {
  if (!await requireSession(req, res)) return;
  const result = await regimeResults.findBySession(req.params.sessionId);
  if (!result) return res.status(404).json({ error: 'Aún no hay obligaciones asignadas para esta sesión.' });

  const obligations = result.type === 'manual'
    ? result.obligations
    : result.result.obligationsDetected.map(o => o.categoriaFiscal);

  res.json({ obligations });
}

module.exports = { runRegimeIdentifier, selectObligationsManually, getRegimeResults, getActiveObligations };
