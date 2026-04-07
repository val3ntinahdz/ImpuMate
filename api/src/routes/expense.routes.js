'use strict';

const { Router } = require('express');
const ctrl        = require('../controllers/expense.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router({ mergeParams: true });
router.use(requireAuth);

router.post('/',              ctrl.addExpense);
router.get('/',               ctrl.listExpenses);
router.get('/:expenseId',     ctrl.getExpense);
router.put('/:expenseId',     ctrl.updateExpense);
router.delete('/:expenseId',  ctrl.deleteExpense);

module.exports = router;
