'use strict';

const { fiscalSessions, accumulatorSnapshots } = require('../services/inMemoryStore');

async function getSummary(req, res, next) {
  try {
    const session = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

    const snapshot = await accumulatorSnapshots.findBySession(req.params.sessionId);
  if (!snapshot) return res.status(404).json({ error: 'Aún no hay gastos evaluados en esta sesión.' });

    res.json(snapshot);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
