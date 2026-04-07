'use strict';

const { Router } = require('express');
const ctrl        = require('../controllers/regime.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router({ mergeParams: true });
router.use(requireAuth);

// Path 2: run RegimeIdentifier algorithm (can be called N times)
router.post('/run',          ctrl.runRegimeIdentifier);

// Path 1: user already knows their regime — manually assign obligations
router.post('/select',       ctrl.selectObligationsManually);

// Read results
router.get('/results',       ctrl.getRegimeResults);
router.get('/obligations',   ctrl.getActiveObligations);

module.exports = router;
