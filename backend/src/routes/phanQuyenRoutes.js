const express = require('express');
const router = express.Router();
const { getAll, getMyPermissions, updatePermission } = require('../controllers/phanQuyenController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.get('/my', getMyPermissions);
router.get('/', requireRole('Admin'), getAll);
router.put('/', requireRole('Admin'), updatePermission);

module.exports = router;
