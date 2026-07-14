const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUserRole, resetPassword, toggleLockUser } = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getAllUsers);
router.post('/', requireRole('Admin'), createUser);
router.put('/:id/role', requireRole('Admin'), updateUserRole);
router.put('/:id/reset-password', requireRole('Admin'), resetPassword);
router.put('/:id/toggle-lock', requireRole('Admin'), toggleLockUser);

module.exports = router;
