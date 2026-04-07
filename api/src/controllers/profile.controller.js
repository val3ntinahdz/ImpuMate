'use strict';

const { users } = require('../services/inMemoryStore');

async function getProfile(req, res) {
  const user = await users.findById(req.session.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
}

async function updateProfile(req, res) {
  const allowed = ['rfc', 'nombreCompleto', 'esSocioAccionista', 'esResidenteExtranjeroConEP',
                   'prefiereResico', 'usesBlindRentalDeduction', 'estadoCumplimientoSat'];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await users.update(req.session.userId, updates);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
}

async function getSatRegimes(req, res) {
  const user = await users.findById(req.session.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ satRegimes: user.satRegimes || [] });
}

async function updateSatRegimes(req, res) {
  const { satRegimes } = req.body;
  if (!Array.isArray(satRegimes)) {
    return res.status(400).json({ error: 'satRegimes debe ser un arreglo.' });
  }
  const user = await users.update(req.session.userId, { satRegimes });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
}

async function getSatObligations(req, res) {
  const user = await users.findById(req.session.userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ satObligations: user.satObligations || [] });
}

async function updateSatObligations(req, res) {
  const { satObligations } = req.body;
  if (!Array.isArray(satObligations)) {
    return res.status(400).json({ error: 'satObligations debe ser un arreglo.' });
  }
  const user = await users.update(req.session.userId, { satObligations });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
}

module.exports = { getProfile, updateProfile, getSatRegimes, updateSatRegimes, getSatObligations, updateSatObligations };
