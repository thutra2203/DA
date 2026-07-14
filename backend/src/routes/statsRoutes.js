const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getStats } = require('../controllers/statsController');

router.get('/', verifyToken, getStats);

module.exports = router;
