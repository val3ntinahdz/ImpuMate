'use strict';

const { fiscalSessions, regimeResults, users } = require('../services/inMemoryStore');
const { buildDeductionCatalog } = require('../../../integrated-algorithms/src/modules/expenseDeductionAdvisor');

async function getCatalog(req, res, next) {
  try {
    const session = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

    const result = await regimeResults.findBySession(req.params.sessionId);
    if (!result) return res.status(400).json({ error: 'Define tus obligaciones fiscales primero.' });

    const obligations = result.type === 'manual'
      ? result.obligations
      : result.result.obligationsDetected.map(o => o.categoriaFiscal);

    const user = await users.findById(req.session.userId);
    const catalog = buildDeductionCatalog({
      currentObligations: obligations,
      usesBlindRentalDeduction: user.usesBlindRentalDeduction ?? false,
    });

    res.json({ obligations, catalog });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCatalog };
