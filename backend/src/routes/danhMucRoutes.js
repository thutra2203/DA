const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  donViCRUD, capBacCRUD, chucVuCRUD,
  toChucNhanSuCRUD, toChucKhoCRUD,
  tinhCRUD, xaCRUD,
  loaiKhoCRUD,
  phanNhomTBKTCRUD, phanLoaiTBKTCRUD, kieuTBKTCRUD,
  nhomDongBoCRUD, chiTietDongBoCRUD,
  tinhTrangTrangBiCRUD, tinhTrangKhoGuiCRUD,
  hinhThucNiemCatCRUD, phanLoaiDongBoCRUD,
  phanCapChatLuongCRUD, donViTinhCRUD, nuocSanXuatCRUD, hangSanXuatCRUD,
  nhaCungCapCRUD, hinhThucThanhToanCRUD, hinhThucCapChuyenCRUD,
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

// Đơn vị hành chính
makeRoutes('tinh', tinhCRUD);
makeRoutes('xa', xaCRUD);

// Tổ chức kho
makeRoutes('loai-kho', loaiKhoCRUD);

// Từ điển về TB (TBKT)
makeRoutes('phan-nhom-tbkt', phanNhomTBKTCRUD);
makeRoutes('phan-loai-tbkt', phanLoaiTBKTCRUD);
makeRoutes('kieu-tbkt', kieuTBKTCRUD);
makeRoutes('nhom-dong-bo', nhomDongBoCRUD);
makeRoutes('chi-tiet-dong-bo', chiTietDongBoCRUD);
makeRoutes('tinh-trang-trang-bi', tinhTrangTrangBiCRUD);
makeRoutes('tinh-trang-kho-gui', tinhTrangKhoGuiCRUD);
makeRoutes('hinh-thuc-niem-cat', hinhThucNiemCatCRUD);
makeRoutes('phan-loai-dong-bo', phanLoaiDongBoCRUD);

// Từ điển dùng chung
makeRoutes('phan-cap-chat-luong', phanCapChatLuongCRUD);
makeRoutes('don-vi-tinh', donViTinhCRUD);
makeRoutes('nuoc-san-xuat', nuocSanXuatCRUD);
makeRoutes('hang-san-xuat', hangSanXuatCRUD);
makeRoutes('nha-cung-cap', nhaCungCapCRUD);
makeRoutes('hinh-thuc-thanh-toan', hinhThucThanhToanCRUD);
makeRoutes('hinh-thuc-cap-chuyen', hinhThucCapChuyenCRUD);

module.exports = router;
