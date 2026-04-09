'use strict';

const { fiscalSessions, expenses, expenseEvaluations, regimeResults } = require('../services/inMemoryStore');
const accumulatorService = require('../services/accumulator.service');
const {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} = require('../../../integrated-algorithms/src/constants/taxCatalogs');

const VALID_EXPENSE_CATEGORIES = new Set(Object.values(EXPENSE_CATEGORIES));
const VALID_PAYMENT_METHODS = new Set(Object.values(PAYMENT_METHODS));

async function requireSession(req, res) {
  const s = await fiscalSessions.findByIdAndUser(req.params.sessionId, req.session.userId);
  if (!s) { res.status(404).json({ error: 'Sesión no encontrada.' }); return null; }
  return s;
}

async function getObligations(sessionId) {
  const result = await regimeResults.findBySession(sessionId);
  if (!result) return [];
  return result.type === 'manual'
    ? result.obligations
    : result.result.obligationsDetected.map(o => o.categoriaFiscal);
}

function attachEvaluationResult(expense, evaluationResult) {
  if (!expense) return null;
  return {
    ...expense,
    evaluationResult: evaluationResult || null,
  };
}

async function attachEvaluationForExpense(expense) {
  const evaluationResult = await expenseEvaluations.findByExpense(expense.id);
  return attachEvaluationResult(expense, evaluationResult);
}

async function attachEvaluationsForExpenses(sessionId, expenseList) {
  const evaluations = await expenseEvaluations.findBySession(sessionId);
  const evaluationByExpenseId = new Map(evaluations.map((evaluation) => [evaluation.expenseId, evaluation]));
  return expenseList.map((expense) => attachEvaluationResult(expense, evaluationByExpenseId.get(expense.id) || null));
}

function validateExpensePayload(payload, { partial = false } = {}) {
  if (!partial || payload.category !== undefined) {
    if (!VALID_EXPENSE_CATEGORIES.has(payload.category)) {
      return {
        status: 400,
        body: {
          error: 'Categoría de gasto inválida.',
          allowedValues: Array.from(VALID_EXPENSE_CATEGORIES),
        },
      };
    }
  }

  if (payload.paymentMethod !== undefined && payload.paymentMethod !== null) {
    if (!VALID_PAYMENT_METHODS.has(payload.paymentMethod)) {
      return {
        status: 400,
        body: {
          error: 'Método de pago inválido.',
          allowedValues: Array.from(VALID_PAYMENT_METHODS),
        },
      };
    }
  }

  return null;
}

async function addExpense(req, res, next) {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const validationError = validateExpensePayload(req.body);
    if (validationError) {
      return res.status(validationError.status).json(validationError.body);
    }

    const obligations = await getObligations(req.params.sessionId);
    if (!obligations.length) {
      return res.status(400).json({ error: 'Define tus obligaciones fiscales antes de registrar gastos.' });
    }

    const expense = await expenses.create({ sessionId: req.params.sessionId, ...req.body });

    // Recalculate accumulator snapshot from scratch after adding
    const snapshot = await accumulatorService.recalculate(req.params.sessionId, session, obligations);
    const expenseWithEvaluation = await attachEvaluationForExpense(expense);

    res.status(201).json({ expense: expenseWithEvaluation, accumulatorSnapshot: snapshot });
  } catch (err) {
    next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const expenseList = await expenses.findBySession(req.params.sessionId);
    res.json(await attachEvaluationsForExpenses(req.params.sessionId, expenseList));
  } catch (err) {
    next(err);
  }
}

async function getExpense(req, res, next) {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const expense = await expenses.findByIdAndSession(req.params.expenseId, req.params.sessionId);
    if (!expense) return res.status(404).json({ error: 'Gasto no encontrado.' });

    res.json({ expense: await attachEvaluationForExpense(expense) });
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const validationError = validateExpensePayload(req.body, { partial: true });
    if (validationError) {
      return res.status(validationError.status).json(validationError.body);
    }

    const expense = await expenses.findByIdAndSession(req.params.expenseId, req.params.sessionId);
    if (!expense) return res.status(404).json({ error: 'Gasto no encontrado.' });

    const updatedExpense = await expenses.update(req.params.expenseId, req.body);

    const obligations = await getObligations(req.params.sessionId);
    const snapshot = await accumulatorService.recalculate(req.params.sessionId, session, obligations);
    const expenseWithEvaluation = await attachEvaluationForExpense(updatedExpense);

    res.json({ expense: expenseWithEvaluation, accumulatorSnapshot: snapshot });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const expense = await expenses.findByIdAndSession(req.params.expenseId, req.params.sessionId);
    if (!expense) return res.status(404).json({ error: 'Gasto no encontrado.' });

    await expenses.remove(req.params.expenseId);

    const obligations = await getObligations(req.params.sessionId);
    const snapshot = await accumulatorService.recalculate(req.params.sessionId, session, obligations);

    res.json({ message: 'Gasto eliminado.', accumulatorSnapshot: snapshot });
  } catch (err) {
    next(err);
  }
}

module.exports = { addExpense, listExpenses, getExpense, updateExpense, deleteExpense };
