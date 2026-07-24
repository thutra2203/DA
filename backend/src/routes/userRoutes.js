const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUserRole, resetPassword, toggleLockUser } = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getAllUsers);
router.post('/', requireRole('ADMIN'), createUser);
router.put('/:id/role', requireRole('ADMIN'), updateUserRole);
router.put('/:id/reset-password', requireRole('ADMIN'), resetPassword);
router.put('/:id/toggle-lock', requireRole('ADMIN'), toggleLockUser);

module.exports = router;
