const express = require('express');
const router = express.Router();
const { getAll, getMyPermissions, updatePermission } = require('../controllers/phanQuyenController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.get('/my', getMyPermissions);
router.get('/', requireRole('ADMIN'), getAll);
router.put('/', requireRole('ADMIN'), updatePermission);

module.exports = router;
