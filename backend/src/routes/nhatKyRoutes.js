const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/nhatKyController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('ADMIN'), getAll);

module.exports = router;
