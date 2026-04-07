'use strict';

const { fiscalSessions } = require('../services/inMemoryStore');

async function createSession(req, res) {
  const { exerciseYear, isrAlreadyWithheldMxn = 0, ivaAlreadyPaidMxn = 0, bufferHorizonMonths = 3 } = req.body;

  if (!exerciseYear || typeof exerciseYear !== 'number') {
    return res.status(400).json({ error: 'exerciseYear es requerido y debe ser un número (ej. 2026).' });
  }

  const existing = await fiscalSessions.findByUserAndYear(req.session.userId, exerciseYear);
  if (existing) {
    return res.status(409).json({ error: `Ya tienes una sesión fiscal abierta para ${exerciseYear}.`, session: existing });
  }

  const session = await fiscalSessions.create({
    userId: req.session.userId,
    exerciseYear,
    isrAlreadyWithheldMxn,
    ivaAlreadyPaidMxn,
    bufferHorizonMonths,
  });

  res.status(201).json(session);
}

async function listSessions(req, res) {
  const sessions = await fiscalSessions.findByUser(req.session.userId);
  res.json(sessions);
}

async function getSession(req, res) {
  const session = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });
  res.json(session);
}

async function updateSession(req, res) {
  const session = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

  const allowed = ['isrAlreadyWithheldMxn', 'ivaAlreadyPaidMxn', 'bufferHorizonMonths'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = await fiscalSessions.update(req.params.sessionId, updates);
  res.json(updated);
}

async function deleteSession(req, res) {
  const session = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada.' });

  await fiscalSessions.remove(req.params.sessionId);
  res.json({ message: 'Sesión fiscal eliminada.' });
}

module.exports = { createSession, listSessions, getSession, updateSession, deleteSession };
