'use strict';

const { Router } = require('express');
const ctrl        = require('../controllers/deductionCatalog.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router({ mergeParams: true });
router.use(requireAuth);

// Returns the catalog of available deductions for the session's active obligations
router.get('/', ctrl.getCatalog);

module.exports = router;
