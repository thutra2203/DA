const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  nhomSpktCRUD, dvtCRUD, nsxCRUD, htttCRUD, htVanChuyenCRUD, loaiTbdbCRUD,
  capChatLuongCRUD, hinhThucNiemCatCRUD, tinhTrangBaoGoiCRUD, trangThaiTbCRUD,
  capBacCRUD, chucVuCRUD, tinhCRUD, loaiKhoCRUD, tinhChatNhapXuatCRUD,
  kieuSpktCRUD, hangSxCRUD, nccCRUD,
  xaCRUD, khoCRUD, loaiSpktCRUD, chiTietTcnxCRUD,
} = require('../controllers/danhMucController');

router.use(verifyToken);

const makeRoutes = (prefix, crud) => {
  router.get(`/${prefix}`, crud.getAll);
  router.post(`/${prefix}`, crud.create);
  router.put(`/${prefix}/:id`, crud.update);
  router.delete(`/${prefix}/:id`, crud.remove);
};

// Nhóm không có khóa ngoại bắt buộc
makeRoutes('nhom-spkt', nhomSpktCRUD);
makeRoutes('dvt', dvtCRUD);
makeRoutes('nsx', nsxCRUD);
makeRoutes('httt', htttCRUD);
makeRoutes('ht-van-chuyen', htVanChuyenCRUD);
makeRoutes('loai-tbdb', loaiTbdbCRUD);
makeRoutes('cap-chat-luong', capChatLuongCRUD);
makeRoutes('hinh-thuc-niem-cat', hinhThucNiemCatCRUD);
makeRoutes('tinh-trang-bao-goi', tinhTrangBaoGoiCRUD);
makeRoutes('trang-thai-tb', trangThaiTbCRUD);
makeRoutes('cap-bac', capBacCRUD);
makeRoutes('chuc-vu', chucVuCRUD);
makeRoutes('tinh', tinhCRUD);
makeRoutes('loai-kho', loaiKhoCRUD);
makeRoutes('tinh-chat-nhap-xuat', tinhChatNhapXuatCRUD);

// Nhóm có khóa ngoại tùy chọn
makeRoutes('kieu-spkt', kieuSpktCRUD);
makeRoutes('hang-sx', hangSxCRUD);
makeRoutes('ncc', nccCRUD);

// Nhóm có khóa ngoại bắt buộc
makeRoutes('xa', xaCRUD);
makeRoutes('kho', khoCRUD);
makeRoutes('loai-spkt', loaiSpktCRUD);
makeRoutes('chi-tiet-tcnx', chiTietTcnxCRUD);

module.exports = router;
