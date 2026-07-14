const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/vaiTroController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.get('/', getAll);
router.post('/', requireRole('Admin'), create);
router.put('/:id', requireRole('Admin'), update);
router.delete('/:id', requireRole('Admin'), remove);

module.exports = router;
