'use strict';

const { Router } = require('express');
const ctrl        = require('../controllers/incomeSource.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router({ mergeParams: true }); // gives access to :sessionId
router.use(requireAuth);

router.post('/',           ctrl.addIncomeSource);
router.get('/',            ctrl.listIncomeSources);
router.put('/:sourceId',   ctrl.updateIncomeSource);
router.delete('/:sourceId', ctrl.deleteIncomeSource);

module.exports = router;
