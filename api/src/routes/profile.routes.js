'use strict';

const { Router } = require('express');
const ctrl       = require('../controllers/profile.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router();
router.use(requireAuth);

router.get('/',                ctrl.getProfile);
router.put('/',                ctrl.updateProfile);
router.get('/sat-regimes',     ctrl.getSatRegimes);
router.put('/sat-regimes',     ctrl.updateSatRegimes);
router.get('/sat-obligations', ctrl.getSatObligations);
router.put('/sat-obligations', ctrl.updateSatObligations);

module.exports = router;
