'use strict';

const { fiscalSessions, incomeSources, accumulatorSnapshots, taxBufferResults, regimeResults } = require('../services/inMemoryStore');
const { calculateTaxBuffer } = require('../../../integrated-algorithms/src/modules/taxBufferCalculator');

function resolveSourceObligationType(source, regimeResult) {
  if (regimeResult?.type === 'algorithm') {
    const detected = regimeResult.result?.obligationsDetected?.find(
      (obligation) => obligation.idFuenteIngreso === source.idFuente,
    );
    return detected?.categoriaFiscal || null;
  }

  if (regimeResult?.type === 'manual') {
    if (source.tipoEconomico) return source.tipoEconomico;
    if (regimeResult.obligations?.length === 1) return regimeResult.obligations[0];
  }

  return source.tipoEconomico || null;
}

async function calculateBuffer(req, res, next) {
  try {
    const session = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

    const regimeResult = await regimeResults.findBySession(req.params.sessionId);
    if (!regimeResult) return res.status(400).json({ error: 'Define tus obligaciones fiscales antes de calcular el buffer.' });

    const obligations = regimeResult.type === 'manual'
      ? regimeResult.obligations
      : regimeResult.result.obligationsDetected.map(o => o.categoriaFiscal);

    const snapshot = await accumulatorSnapshots.findBySession(req.params.sessionId);

    const sources = await incomeSources.findBySession(req.params.sessionId);
    if (!sources.length) {
      return res.status(400).json({ error: 'Agrega al menos una fuente de ingreso antes de calcular el buffer.' });
    }

    const incomeSourcesForBuffer = sources.map((s) => ({
      obligationType: resolveSourceObligationType(s, regimeResult),
      grossAnnualAmountMXN: s.montoAnualEstimado,
      isSubjectToIVA: s.isSubjectToIva,
      clientRetainsISR: s.clienteRetieneISR ?? false,
      clientRetainsIVA: s.clienteRetieneIVA ?? false,
    }));

    if (incomeSourcesForBuffer.some((source) => !source.obligationType)) {
      return res.status(400).json({
        error: 'No fue posible determinar la obligación fiscal de todas las fuentes para calcular el buffer.',
      });
    }

    const input = {
      currentObligations: obligations,
      incomeSources: incomeSourcesForBuffer,
      annualContext: {
        totalApprovedPersonalDeductiblesMXN:  snapshot?.totalPersonalDeductiblesMxn  ?? 0,
        totalApprovedActivityDeductiblesMXN:  snapshot?.totalActivityDeductiblesMxn  ?? 0,
        totalEstimatedIVAAcreditableMXN:      snapshot?.totalIvaAcreditableMxn       ?? 0,
        isrAlreadyWithheldBySalaryMXN:        session.isrAlreadyWithheldMxn          ?? 0,
        ivaAlreadyPaidToSATMXN:               session.ivaAlreadyPaidMxn              ?? 0,
      },
      bufferHorizonMonths: session.bufferHorizonMonths ?? 3,
    };

    const result = calculateTaxBuffer(input);

    await taxBufferResults.save(req.params.sessionId, result);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getLatestResult(req, res, next) {
  try {
    const session = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

    const result = await taxBufferResults.findBySession(req.params.sessionId);
    if (!result) return res.status(404).json({ error: 'Aún no se ha calculado el buffer para esta sesión.' });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { calculateBuffer, getLatestResult };
