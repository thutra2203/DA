const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/vaiTroController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.get('/', getAll);
router.post('/', requireRole('ADMIN'), create);
router.put('/:id', requireRole('ADMIN'), update);
router.delete('/:id', requireRole('ADMIN'), remove);

module.exports = router;
