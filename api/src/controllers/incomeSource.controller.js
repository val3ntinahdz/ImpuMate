'use strict';

const { fiscalSessions, incomeSources } = require('../services/inMemoryStore');

async function requireSession(req, res) {
  const s = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
  if (!s) { res.status(404).json({ error: 'Sesión no encontrada.' }); return null; }
  return s;
}

async function addIncomeSource(req, res) {
  if (!await requireSession(req, res)) return;

  const { idFuente, descripcion, tipoEconomico, montoAnualEstimado, quienPaga,
          existeRelacionSubordinada, recibeCfdiNomina, vendeBienes,
          prestaSErvcioIndependiente, otorgaUsoGoceInmueble, usaPlataformaTecnologica,
          emiteCFDI, clienteRetieneISR, clienteRetieneIVA,
          isSubjectToIva, solicitaTributarEnResico } = req.body;

  if (!idFuente || montoAnualEstimado === undefined || !quienPaga) {
    return res.status(400).json({ error: 'Campos requeridos: idFuente, montoAnualEstimado, quienPaga.' });
  }

  const source = await incomeSources.create({
    sessionId: req.params.sessionId,
    idFuente, descripcion, tipoEconomico, montoAnualEstimado, quienPaga,
    existeRelacionSubordinada: existeRelacionSubordinada ?? false,
    recibeCfdiNomina: recibeCfdiNomina ?? false,
    vendeBienes: vendeBienes ?? false,
    prestaSErvcioIndependiente: prestaSErvcioIndependiente ?? false,
    otorgaUsoGoceInmueble: otorgaUsoGoceInmueble ?? false,
    usaPlataformaTecnologica: usaPlataformaTecnologica ?? false,
    emiteCFDI: emiteCFDI ?? false,
    clienteRetieneISR: clienteRetieneISR ?? false,
    clienteRetieneIVA: clienteRetieneIVA ?? false,
    isSubjectToIva: isSubjectToIva ?? false,
    solicitaTributarEnResico: solicitaTributarEnResico ?? false,
  });

  res.status(201).json(source);
}

async function listIncomeSources(req, res) {
  if (!await requireSession(req, res)) return;
  res.json(await incomeSources.findBySession(req.params.sessionId));
}

async function updateIncomeSource(req, res) {
  if (!await requireSession(req, res)) return;

  const source = await incomeSources.findByIdAndSession(req.params.sourceId, req.params.sessionId);
  if (!source) return res.status(404).json({ error: 'Fuente de ingreso no encontrada.' });

  const updated = await incomeSources.update(req.params.sourceId, req.body);
  res.json(updated);
}

async function deleteIncomeSource(req, res) {
  if (!await requireSession(req, res)) return;

  const source = await incomeSources.findByIdAndSession(req.params.sourceId, req.params.sessionId);
  if (!source) return res.status(404).json({ error: 'Fuente de ingreso no encontrada.' });

  await incomeSources.remove(req.params.sourceId);
  res.json({ message: 'Fuente de ingreso eliminada.' });
}

module.exports = { addIncomeSource, listIncomeSources, updateIncomeSource, deleteIncomeSource };
