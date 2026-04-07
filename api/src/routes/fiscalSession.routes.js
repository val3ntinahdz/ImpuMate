'use strict';

const { Router } = require('express');
const ctrl        = require('../controllers/fiscalSession.controller');
const requireAuth = require('../middlewares/requireAuth');

const router = Router();
router.use(requireAuth);

router.post('/',           ctrl.createSession);
router.get('/',            ctrl.listSessions);
router.get('/:sessionId',  ctrl.getSession);
router.put('/:sessionId',  ctrl.updateSession);
router.delete('/:sessionId', ctrl.deleteSession);

module.exports = router;
