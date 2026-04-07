'use strict';

const { Router } = require('express');
const ctrl        = require('../controllers/deductionsSummary.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router({ mergeParams: true });
router.use(requireAuth);

// Current accumulator snapshot for the session
router.get('/summary', ctrl.getSummary);

module.exports = router;
