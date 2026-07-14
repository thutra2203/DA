const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  donViCRUD, capBacCRUD, chucVuCRUD,
  toChucNhanSuCRUD, toChucKhoCRUD,
  tuDienTBN1CRUD, tuDienTBN2CRUD, tuDienDungChungCRUD,
} = require('../controllers/danhMucController');

router.use(verifyToken);

const makeRoutes = (prefix, crud) => {
  router.get(`/${prefix}`, crud.getAll);
  router.post(`/${prefix}`, crud.create);
  router.put(`/${prefix}/:id`, crud.update);
  router.delete(`/${prefix}/:id`, crud.remove);
};

makeRoutes('don-vi', donViCRUD);
makeRoutes('cap-bac', capBacCRUD);
makeRoutes('chuc-vu', chucVuCRUD);
makeRoutes('to-chuc-nhan-su', toChucNhanSuCRUD);
makeRoutes('to-chuc-kho', toChucKhoCRUD);
makeRoutes('tu-dien-tbn1', tuDienTBN1CRUD);
makeRoutes('tu-dien-tbn2', tuDienTBN2CRUD);
makeRoutes('tu-dien-dung-chung', tuDienDungChungCRUD);

module.exports = router;
