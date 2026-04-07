'use strict';

const { Router } = require('express');
const ctrl        = require('../controllers/taxBuffer.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router({ mergeParams: true });
router.use(requireAuth);

// On-demand calculation triggered by the user
router.post('/calculate', ctrl.calculateBuffer);

// Retrieve the latest saved result
router.get('/latest',     ctrl.getLatestResult);

module.exports = router;
