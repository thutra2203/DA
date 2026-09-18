SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF DB_ID(N'QLVKTB') IS NULL
BEGIN
    CREATE DATABASE QLVKTB;
END;
GO

USE QLVKTB;
GO

/* =========================================================
   I. DANH MUC HE THONG
   ========================================================= */

CREATE TABLE dbo.NhomSPKT (
  CONSTRAINT [PK_NhomSPKT] PRIMARY KEY ([maNhom]),
  [maNhom] varchar(30) NOT NULL,
  [tenNhom] nvarchar(200) NOT NULL,
  [moTa] nvarchar(500) NULL,
  CONSTRAINT [UQ_NhomSPKT_tenNhom] UNIQUE ([tenNhom])
);

CREATE TABLE dbo.LoaiSPKT (
  CONSTRAINT [PK_LoaiSPKT] PRIMARY KEY ([maLoai]),
  [maLoai] varchar(30) NOT NULL,
  [maNhom] varchar(30) NOT NULL,
  [tenLoai] nvarchar(100) NOT NULL,
  [co] varchar(20) NULL,
  [kiHieu] varchar(30) NULL,
  [maNSX] varchar(20) NULL,
  [maDVT] varchar(20) NULL,
  [ghiChu] nvarchar(200) NULL,
  [maKieu] varchar(30) NULL
);

CREATE TABLE dbo.KieuSPKT (
  CONSTRAINT [PK_KieuSPKT] PRIMARY KEY ([maKieu]),
  [maKieu] varchar(30) NOT NULL,
  [tenKieu] nvarchar(200) NOT NULL,
  [maNSX] varchar(20) NULL,
  [maDVT] varchar(20) NULL,
  [ghiChu] nvarchar(200) NULL,
  [maNhom] varchar(30) NULL
);

CREATE TABLE dbo.LoaiTBDB (
  CONSTRAINT [PK_LoaiTBDB] PRIMARY KEY ([maLoai]),
  [maLoai] varchar(20) NOT NULL,
  [tenLoai] nvarchar(100) NOT NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.CapChatLuong (
  CONSTRAINT [PK_CapChatLuong] PRIMARY KEY ([maCap]),
  [maCap] int NOT NULL,
  [tenCap] nvarchar(100) NOT NULL,
  [moTa] nvarchar(500) NULL,
  CONSTRAINT [CK_CapChatLuong_maCap] CHECK ([maCap]>=(1) AND [maCap]<=(5))
);

CREATE TABLE dbo.DVT (
  CONSTRAINT [PK_DVT] PRIMARY KEY ([maDVT]),
  [maDVT] varchar(20) NOT NULL,
  [tenDVT] nvarchar(200) NOT NULL,
  [donViCoBan] varchar(20) NULL,
  [heSoCoBan] float NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.NSX (
  CONSTRAINT [PK_NSX] PRIMARY KEY ([maNSX]),
  [maNSX] varchar(20) NOT NULL,
  [tenNSX] nvarchar(100) NOT NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.HangSX (
  CONSTRAINT [PK_HangSX] PRIMARY KEY ([maHSX]),
  [maHSX] varchar(20) NOT NULL,
  [tenHSX] nvarchar(100) NOT NULL,
  [diaChi] nvarchar(200) NULL,
  [email] varchar(100) NULL,
  [SDT] varchar(20) NULL,
  [ghiChu] nvarchar(200) NULL,
  [maNSX] varchar(20) NULL
);

CREATE TABLE dbo.NCC (
  CONSTRAINT [PK_NCC] PRIMARY KEY ([maNCC]),
  [maNCC] varchar(20) NOT NULL,
  [tenNCC] nvarchar(100) NOT NULL,
  [diaChi] nvarchar(200) NULL,
  [email] varchar(100) NULL,
  [SDT] varchar(20) NULL,
  [ghiChu] nvarchar(200) NULL,
  [maNSX] varchar(20) NULL
);

CREATE TABLE dbo.HTTT (
  CONSTRAINT [PK_HTTT] PRIMARY KEY ([maHTTT]),
  [maHTTT] varchar(20) NOT NULL,
  [tenHTTT] nvarchar(100) NOT NULL,
  [mucPhi] decimal(18,2) NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.HTVanChuyen (
  CONSTRAINT [PK_HTVanChuyen] PRIMARY KEY ([maHTVC]),
  [maHTVC] varchar(20) NOT NULL,
  [tenHTVC] nvarchar(100) NOT NULL,
  [mucPhi] decimal(18,2) NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.TinhChatNhapXuat (
  CONSTRAINT [PK_TinhChatNhapXuat] PRIMARY KEY ([maNX]),
  [maNX] varchar(20) NOT NULL,
  [tenNX] nvarchar(200) NOT NULL,
  [nhomTB] varchar(50) NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.ChiTietTCNX (
  CONSTRAINT [PK_ChiTietTCNX] PRIMARY KEY ([maCTNX]),
  [maCTNX] varchar(20) NOT NULL,
  [tenCTNX] nvarchar(200) NOT NULL,
  [maNX] varchar(20) NOT NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.HinhThucNiemCat (
  CONSTRAINT [PK_HinhThucNiemCat] PRIMARY KEY ([maHTNC]),
  [maHTNC] varchar(20) NOT NULL,
  [tenHTNC] nvarchar(100) NOT NULL
);

CREATE TABLE dbo.TinhTrangBaoGoi (
  CONSTRAINT [PK_TinhTrangBaoGoi] PRIMARY KEY ([maTTBG]),
  [maTTBG] varchar(20) NOT NULL,
  [tenTTBG] nvarchar(200) NOT NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.TrangThaiTB (
  CONSTRAINT [PK_TrangThaiTB] PRIMARY KEY ([maTTTB]),
  [maTTTB] varchar(20) NOT NULL,
  [tenTTTB] nvarchar(200) NOT NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.CapBac (
  CONSTRAINT [PK_CapBac] PRIMARY KEY ([maCapBac]),
  [maCapBac] varchar(20) NOT NULL,
  [tenCapBac] nvarchar(100) NOT NULL,
  [thuTu] int NULL
);

CREATE TABLE dbo.ChucVu (
  CONSTRAINT [PK_ChucVu] PRIMARY KEY ([maChucVu]),
  [maChucVu] varchar(50) NOT NULL,
  [tenChucVu] nvarchar(200) NOT NULL,
  [moTa] nvarchar(500) NULL
);

CREATE TABLE dbo.Tinh (
  CONSTRAINT [PK_Tinh] PRIMARY KEY ([maTinh]),
  [maTinh] varchar(5) NOT NULL,
  [tenTinh] nvarchar(100) NOT NULL,
  [vungMien] varchar(10) NULL,
  [ghiChu] nvarchar(200) NULL,
  CONSTRAINT [CK_Tinh_vungMien] CHECK ([vungMien]='NAM' OR [vungMien]='TRUNG' OR [vungMien]='BAC')
);

CREATE TABLE dbo.Xa (
  CONSTRAINT [PK_Xa] PRIMARY KEY ([maXa]),
  [maXa] varchar(6) NOT NULL,
  [maTinh] varchar(5) NOT NULL,
  [tenXa] nvarchar(100) NOT NULL,
  [ghiChu] nvarchar(150) NULL
);

CREATE TABLE dbo.CapQuanLy (
  CONSTRAINT [PK_CapQuanLy] PRIMARY KEY ([maCapQuanLy]),
  [maCapQuanLy] varchar(10) NOT NULL,
  [tenCapQuanLy] nvarchar(100) NOT NULL,
  [ghiChu] nvarchar(500) NULL,
  [thuTuHienThi] int NULL
);

/* =========================================================
   II. TO CHUC DON VI VA KHO BAI
   ========================================================= */

CREATE TABLE dbo.LoaiKho (
  CONSTRAINT [PK_LoaiKho] PRIMARY KEY ([maLoaiKho]),
  [maLoaiKho] varchar(30) NOT NULL,
  [tenLoaiKho] nvarchar(100) NOT NULL,
  [ghiChu] nvarchar(500) NULL
);

CREATE TABLE dbo.Kho (
  CONSTRAINT [PK_Kho] PRIMARY KEY ([maKho]),
  [maKho] varchar(30) NOT NULL,
  [maLoaiKho] varchar(30) NOT NULL,
  [tenKho] nvarchar(200) NOT NULL,
  [dienTich] decimal(10,2) NULL,
  [diaChi] nvarchar(200) NULL,
  [maXa] varchar(6) NULL,
  [maTinh] varchar(5) NULL,
  [ghiChu] nvarchar(500) NULL,
  [maCapQuanLy] varchar(10) NULL
);

CREATE TABLE dbo.NhaKho (
  CONSTRAINT [PK_NhaKho] PRIMARY KEY ([maNhaKho]),
  [maNhaKho] varchar(30) NOT NULL,
  [maKho] varchar(30) NOT NULL,
  [tenNhaKho] nvarchar(100) NOT NULL,
  [ghiChu] nvarchar(500) NULL
);

/* =========================================================
   III. DONG BO, HO SO SPKT VA TBDB
   ========================================================= */

CREATE TABLE dbo.NhomDongBo (
  CONSTRAINT [PK_NhomDongBo] PRIMARY KEY ([maKieuSPKT], [maLoaiTBDB]),
  [maKieuSPKT] varchar(30) NOT NULL,
  [maLoaiTBDB] varchar(20) NOT NULL,
  [ghiChu] nvarchar(200) NULL
);

CREATE TABLE dbo.ChiTietDongBo (
  CONSTRAINT [PK_ChiTietDongBo] PRIMARY KEY ([maKieuSPKT], [maLoaiTBDB], [maTBDB]),
  [maKieuSPKT] varchar(30) NOT NULL,
  [maLoaiTBDB] varchar(20) NOT NULL,
  [maTBDB] varchar(30) NOT NULL,
  [soLuongSPKTCoSo] int NOT NULL DEFAULT ((1)),
  [SLDinhMuc] int NOT NULL,
  [ghiChu] nvarchar(200) NULL,
  CONSTRAINT [CK_CTDB_SoLuongSPKTCoSo] CHECK ([soLuongSPKTCoSo]>(0)),
  CONSTRAINT [CK_CTDB_SLDinhMuc] CHECK ([SLDinhMuc]>=(0))
);

CREATE TABLE dbo.HoSoSPKT (
  CONSTRAINT [PK_HoSoSPKT] PRIMARY KEY ([soHieu]),
  [soHieu] varchar(30) NOT NULL,
  [maLoaiSPKT] varchar(30) NOT NULL,
  [namSX] int NULL,
  [maNuocSX] varchar(20) NULL,
  [maCCL] int NULL,
  [maDVT] varchar(20) NULL,
  [maHinhThucNiemCat] varchar(20) NULL,
  [maTinhTrangBaoGoi] varchar(20) NULL,
  [maKho] varchar(30) NULL,
  [tenNhaKho] nvarchar(100) NULL,
  [tenDinhKhu] nvarchar(100) NULL,
  [tenKhoi] nvarchar(100) NULL,
  [tenTang] nvarchar(100) NULL,
  [tenHom] nvarchar(100) NULL,
  [maTrangThaiTB] varchar(20) NULL,
  [viTri] nvarchar(500) NULL,
  [soLuong] int NOT NULL DEFAULT ((0)),
  [donGia] decimal(18,2) NULL,
  [thanhTien] AS (isnull([soLuong],(0))*isnull([donGia],(0))) PERSISTED,
  [ghiChu] nvarchar(1000) NULL,
  [thoiGianTao] datetime2 NOT NULL DEFAULT (sysdatetime()),
  [capNhatMoiNhat] datetime2 NULL
);

CREATE TABLE dbo.TBDB (
  CONSTRAINT [PK_TBDB] PRIMARY KEY ([maTBDB]),
  [maTBDB] varchar(30) NOT NULL,
  [maLoaiTBDB] varchar(20) NOT NULL,
  [tenTBDB] nvarchar(100) NULL,
  [maDVT] varchar(20) NULL,
  [ghiChu] nvarchar(1000) NULL,
  [thoiGianTao] datetime2 NOT NULL DEFAULT (sysdatetime()),
  [capNhatMoiNhat] datetime2 NULL
);

CREATE TABLE dbo.LoTBDB (
  CONSTRAINT [PK_LoTBDB] PRIMARY KEY ([maLoTBDB]),
  [maLoTBDB] varchar(30) NOT NULL,
  [maTBDB] varchar(30) NOT NULL,
  [maCTDongBoLenh] bigint NOT NULL,
  [maCCL] int NOT NULL,
  [namSX] int NULL,
  [maNuocSX] varchar(20) NULL,
  [maTinhTrangBaoGoi] varchar(20) NULL,
  [donGia] decimal(18,2) NOT NULL,
  [soLuongNhap] int NOT NULL,
  [trangThaiLo] varchar(20) NOT NULL DEFAULT ('NHAP'),
  [ghiChu] nvarchar(500) NULL,
  [thoiGianTao] datetime2 NOT NULL DEFAULT (sysdatetime()),
  [capNhatMoiNhat] datetime2 NULL,
  [maHinhThucNiemCat] varchar(20) NULL,
  CONSTRAINT [UQ_LoTBDB_CTDongBo] UNIQUE ([maCTDongBoLenh]),
  CONSTRAINT [CK_LoTBDB_DonGia] CHECK ([donGia]>=(0)),
  CONSTRAINT [CK_LoTBDB_SoLuongNhap] CHECK ([soLuongNhap]>(0)),
  CONSTRAINT [CK_LoTBDB_NamSX] CHECK ([namSX] IS NULL OR [namSX]>=(1900) AND [namSX]<=(2100))
);

CREATE TABLE dbo.TonKhoTBDB (
  CONSTRAINT [PK_TonKhoTBDB] PRIMARY KEY ([maTonKho]),
  [maTonKho] bigint IDENTITY(1,1) NOT NULL,
  [maLoTBDB] varchar(30) NOT NULL,
  [maKho] varchar(30) NOT NULL,
  [tenNhaKho] nvarchar(100) NULL,
  [tenDinhKhu] nvarchar(100) NULL,
  [tenKhoi] nvarchar(100) NULL,
  [tenGia] nvarchar(100) NULL,
  [tenTang] nvarchar(100) NULL,
  [tenHom] nvarchar(100) NULL,
  [moTaViTri] nvarchar(300) NULL,
  [maTrangThaiTB] varchar(20) NOT NULL,
  [soLuong] int NOT NULL,
  [ghiChu] nvarchar(500) NULL,
  [capNhatMoiNhat] datetime2 NOT NULL DEFAULT (sysdatetime()),
  CONSTRAINT [CK_TonKhoTBDB_SoLuong] CHECK ([soLuong]>=(0))
);

/* =========================================================
   IV. LENH NHAP XUAT
   ========================================================= */

CREATE TABLE dbo.Lenh (
  CONSTRAINT [PK_Lenh] PRIMARY KEY ([maLenh]),
  [maLenh] varchar(30) NOT NULL,
  [maLoaiLenh] varchar(20) NOT NULL,
  [maLenhChiTiet] varchar(20) NULL,
  [ngay] date NOT NULL,
  [ngayHieuLuc] date NULL,
  [giaTriDenNgay] date NULL,
  [trangThai] varchar(30) NULL,
  [canCu] nvarchar(200) NULL,
  [veViec] nvarchar(200) NULL,
  [maHTTT] varchar(20) NULL,
  [maKhoNhap] varchar(30) NULL,
  [maKhoXuat] varchar(30) NULL,
  [ptVanChuyen] nvarchar(100) NULL,
  [nguoiTao] nvarchar(200) NULL,
  [ghiChu] nvarchar(1000) NULL,
  [maNCC] varchar(20) NULL,
  [donViChuyen] nvarchar(200) NULL
);

CREATE TABLE dbo.ChiTietLenh (
  CONSTRAINT [PK_ChiTietLenh] PRIMARY KEY ([maCTLenh]),
  [maCTLenh] int IDENTITY(1,1) NOT NULL,
  [maLenh] varchar(30) NOT NULL,
  [maLoaiSPKT] varchar(30) NULL,
  [maLoaiTBDB] varchar(20) NULL,
  [maCCL] int NULL,
  [soLuong] int NOT NULL,
  [slThuc] int NULL,
  [ghiChu] nvarchar(500) NULL,
  CONSTRAINT [CK_CTL_LoaiTrangBi] CHECK ([maLoaiSPKT] IS NOT NULL AND [maLoaiTBDB] IS NULL OR [maLoaiSPKT] IS NULL AND [maLoaiTBDB] IS NOT NULL),
  CONSTRAINT [CK_CTL_SoLuong] CHECK ([soLuong]>(0)),
  CONSTRAINT [CK_CTL_SLThuc] CHECK ([slThuc] IS NULL OR [slThuc]>=(0))
);

CREATE TABLE dbo.SPKTTrongLenh (
  CONSTRAINT [PK_SPKTTrongLenh] PRIMARY KEY ([maCTLenh], [soHieu]),
  [maCTLenh] int NOT NULL,
  [soHieu] varchar(30) NOT NULL,
  [maLoaiSPKT] varchar(30) NOT NULL,
  [namSX] int NULL,
  [maNuocSX] varchar(20) NULL,
  [maCCL] int NULL,
  [hinhThucNiemCat] varchar(20) NULL,
  [maTinhTrangBaoGoi] varchar(20) NULL,
  [maKho] varchar(30) NULL,
  [tenNhaKho] nvarchar(100) NULL,
  [tenDinhKhu] nvarchar(100) NULL,
  [tenKhoi] nvarchar(100) NULL,
  [tenTang] nvarchar(100) NULL,
  [tenHom] nvarchar(100) NULL,
  [maTrangThaiTB] varchar(20) NULL,
  [viTri] nvarchar(500) NULL,
  [soLuong] int NOT NULL,
  [donGia] decimal(18,2) NULL,
  [thanhTien] AS (isnull([soLuong],(0))*isnull([donGia],(0))) PERSISTED,
  [ghiChu] nvarchar(1000) NULL
);

CREATE TABLE dbo.CTDongBoTrongLenh (
  CONSTRAINT [PK_CTDongBoTrongLenh] PRIMARY KEY ([maCTDongBoLenh]),
  [maCTDongBoLenh] bigint IDENTITY(1,1) NOT NULL,
  [maLenh] varchar(30) NOT NULL,
  [maTBDB] varchar(30) NOT NULL,
  [maCCL] int NULL,
  [soLuongTheoLenh] int NOT NULL,
  [donGiaTheoLenh] decimal(18,2) NULL,
  [ghiChu] nvarchar(500) NULL,
  [soLuongThuc] int NULL,
  [maTonKho] bigint NULL,
  CONSTRAINT [CK_CTDBTL_SoLuong] CHECK ([soLuongTheoLenh]>(0)),
  CONSTRAINT [CK_CTDBTL_DonGia] CHECK ([donGiaTheoLenh] IS NULL OR [donGiaTheoLenh]>=(0)),
  CONSTRAINT [CK_CTDBTL_SoLuongThuc] CHECK ([soLuongThuc] IS NULL OR [soLuongThuc]>=(0) AND [soLuongThuc]<=[soLuongTheoLenh])
);

CREATE TABLE dbo.CTXuatKho (
  CONSTRAINT [PK_CTXuatKho] PRIMARY KEY ([maCTXuatKho]),
  [maCTXuatKho] bigint IDENTITY(1,1) NOT NULL,
  [maCTDongBoLenh] bigint NOT NULL,
  [maTonKho] bigint NOT NULL,
  [soLuong] int NOT NULL
);

CREATE TABLE dbo.LenhChuyenCap (
  CONSTRAINT [PK_LenhChuyenCap] PRIMARY KEY ([maLenh]),
  [maLenh] varchar(30) NOT NULL,
  [maKho] varchar(30) NOT NULL,
  [ngayLap] date NOT NULL,
  [trangThai] varchar(20) NULL,
  [nguoiTao] nvarchar(100) NULL,
  [nguoiKetThuc] nvarchar(100) NULL,
  [ngayKetThuc] date NULL,
  [ghiChu] nvarchar(500) NULL,
  [canCu] nvarchar(400) NULL,
  [veViec] nvarchar(400) NULL
);

CREATE TABLE dbo.ChiTietLenhChuyenCap (
  CONSTRAINT [PK_ChiTietLenhChuyenCap] PRIMARY KEY ([maCTLenhChuyenCap]),
  [maCTLenhChuyenCap] int IDENTITY(1,1) NOT NULL,
  [maLenh] varchar(30) NOT NULL,
  [maTonKho] bigint NOT NULL,
  [maLoTBDB] varchar(30) NOT NULL,
  [soLuong] int NOT NULL,
  [ghiChu] nvarchar(500) NULL,
  [maCclCu] int NOT NULL,
  [maCclMoi] int NOT NULL,
  [trangThaiGoc] varchar(20) NULL
);

CREATE TABLE dbo.LenhThayDoiHTNC (
  CONSTRAINT [PK_LenhThayDoiHTNC] PRIMARY KEY ([maLenh]),
  [maLenh] varchar(30) NOT NULL,
  [maKho] varchar(30) NOT NULL,
  [ngayLap] date NOT NULL,
  [trangThai] varchar(20) NULL,
  [nguoiTao] nvarchar(200) NULL,
  [nguoiKetThuc] nvarchar(200) NULL,
  [ngayKetThuc] date NULL,
  [ghiChu] nvarchar(1000) NULL,
  [canCu] nvarchar(800) NULL,
  [veViec] nvarchar(800) NULL
);

CREATE TABLE dbo.ChiTietLenhThayDoiHTNC (
  CONSTRAINT [PK_ChiTietLenhThayDoiHTNC] PRIMARY KEY ([maCTLenhThayDoiHTNC]),
  [maCTLenhThayDoiHTNC] int IDENTITY(1,1) NOT NULL,
  [maLenh] varchar(30) NOT NULL,
  [maTonKho] bigint NOT NULL,
  [maLoTBDB] varchar(30) NOT NULL,
  [soLuong] int NOT NULL,
  [maHtncCu] varchar(20) NULL,
  [maHtncMoi] varchar(20) NOT NULL,
  [trangThaiGoc] varchar(20) NULL,
  [ghiChu] nvarchar(1000) NULL
);

CREATE TABLE dbo.LenhThayDoiViTri (
  CONSTRAINT [PK_LenhThayDoiViTri] PRIMARY KEY ([maLenh]),
  [maLenh] varchar(30) NOT NULL,
  [maKho] varchar(30) NOT NULL,
  [ngayLap] date NOT NULL,
  [trangThai] varchar(20) NULL,
  [nguoiTao] nvarchar(200) NULL,
  [nguoiKetThuc] nvarchar(200) NULL,
  [ngayKetThuc] date NULL,
  [ghiChu] nvarchar(1000) NULL,
  [canCu] nvarchar(400) NULL,
  [veViec] nvarchar(400) NULL
);

CREATE TABLE dbo.ChiTietLenhThayDoiViTri (
  CONSTRAINT [PK_ChiTietLenhThayDoiViTri] PRIMARY KEY ([maCTLenhThayDoiViTri]),
  [maCTLenhThayDoiViTri] int IDENTITY(1,1) NOT NULL,
  [maLenh] varchar(30) NOT NULL,
  [maTonKho] bigint NOT NULL,
  [maLoTBDB] varchar(30) NOT NULL,
  [soLuong] int NOT NULL,
  [tenNhaKhoMoi] nvarchar(200) NULL,
  [tenDinhKhuMoi] nvarchar(200) NULL,
  [tenKhoiMoi] nvarchar(200) NULL,
  [tenGiaMoi] nvarchar(200) NULL,
  [tenTangMoi] nvarchar(200) NULL,
  [tenHomMoi] nvarchar(200) NULL,
  [moTaViTriMoi] nvarchar(600) NULL,
  [ghiChu] nvarchar(1000) NULL,
  [trangThaiGoc] varchar(20) NULL
);

/* =========================================================
   V. KIEM KE VA CHUYEN KY
   ========================================================= */

CREATE TABLE dbo.DotKiemKe (
  CONSTRAINT [PK_DotKiemKe] PRIMARY KEY ([maDotKiemKe]),
  [maDotKiemKe] varchar(30) NOT NULL,
  [tenDotKiemKe] nvarchar(200) NOT NULL,
  [ngayBatDau] date NOT NULL,
  [ngayKetThuc] date NULL,
  [trangThai] varchar(30) NULL,
  [noiDung] nvarchar(1000) NULL,
  [ghiChu] nvarchar(500) NULL,
  [nam] int NULL
);

CREATE TABLE dbo.PhieuKiemKe (
  CONSTRAINT [PK_PhieuKiemKe] PRIMARY KEY ([maPhieuKiemKe]),
  [maPhieuKiemKe] varchar(30) NOT NULL,
  [maDotKiemKe] varchar(30) NOT NULL,
  [ngayLap] date NOT NULL,
  [ngayKiemKe] date NULL,
  [maKho] varchar(30) NOT NULL,
  [nhomTB] nvarchar(50) NOT NULL,
  [noiDung] nvarchar(500) NULL,
  [trangThai] nvarchar(50) NULL,
  [nguoiTao] nvarchar(100) NULL,
  [nguoiKiemKe] nvarchar(100) NULL,
  [ngayKetThuc] date NULL
);

CREATE TABLE dbo.ChiTietKiemKe (
  CONSTRAINT [PK_ChiTietKiemKe] PRIMARY KEY ([maCTKiemKe]),
  [maCTKiemKe] int IDENTITY(1,1) NOT NULL,
  [maPhieuKiemKe] varchar(30) NOT NULL,
  [maLoaiSPKT] varchar(30) NULL,
  [maTBDB] varchar(30) NULL,
  [soLuongKyTruoc] int NOT NULL DEFAULT ((0)),
  [soTang] int NOT NULL DEFAULT ((0)),
  [soGiam] int NOT NULL DEFAULT ((0)),
  [soLuongSoSach] int NOT NULL DEFAULT ((0)),
  [soLuongThucTe] int NOT NULL DEFAULT ((0)),
  [thua] AS (case when [soLuongThucTe]>[soLuongSoSach] then [soLuongThucTe]-[soLuongSoSach] else (0) end) PERSISTED,
  [thieu] AS (case when [soLuongSoSach]>[soLuongThucTe] then [soLuongSoSach]-[soLuongThucTe] else (0) end) PERSISTED,
  [ghiChu] nvarchar(500) NULL,
  [maCCL] int NULL,
  CONSTRAINT [CK_CTKT_DoiTuong] CHECK ([maLoaiSPKT] IS NOT NULL AND [maTBDB] IS NULL OR [maLoaiSPKT] IS NULL AND [maTBDB] IS NOT NULL)
);

CREATE TABLE dbo.ChiTietKiemKeViTri (
  CONSTRAINT [PK_ChiTietKiemKeViTri] PRIMARY KEY ([maCTKiemKeViTri]),
  [maCTKiemKeViTri] int IDENTITY(1,1) NOT NULL,
  [maCTKiemKe] int NOT NULL,
  [maLoTBDB] varchar(30) NULL,
  [tenNhaKho] nvarchar(100) NULL,
  [tenDinhKhu] nvarchar(100) NULL,
  [tenKhoi] nvarchar(100) NULL,
  [tenGia] nvarchar(100) NULL,
  [tenTang] nvarchar(100) NULL,
  [tenHom] nvarchar(100) NULL,
  [moTaViTri] nvarchar(300) NULL,
  [soLuongSoSach] int NOT NULL,
  [soLuongThucTe] int NOT NULL,
  [thua] AS (case when [soLuongThucTe]>[soLuongSoSach] then [soLuongThucTe]-[soLuongSoSach] else (0) end) PERSISTED,
  [thieu] AS (case when [soLuongSoSach]>[soLuongThucTe] then [soLuongSoSach]-[soLuongThucTe] else (0) end) PERSISTED,
  [ghiChu] nvarchar(500) NULL,
  [maTonKho] bigint NULL
);

CREATE TABLE dbo.ChuyenKy (
  CONSTRAINT [PK_ChuyenKy] PRIMARY KEY ([maChuyenKy]),
  [maChuyenKy] varchar(30) NOT NULL,
  [maPhieuKiemKe] varchar(30) NOT NULL,
  [namCu] int NOT NULL,
  [namMoi] int NOT NULL,
  [ngayChuyen] date NOT NULL,
  [trangThai] nvarchar(30) NULL,
  [nguoiThucHien] nvarchar(100) NULL,
  [ghiChu] nvarchar(500) NULL,
  CONSTRAINT [CK_ChuyenKy_Nam] CHECK ([namMoi]=([namCu]+(1)))
);

CREATE TABLE dbo.TonDauKy (
  CONSTRAINT [PK_TonDauKy] PRIMARY KEY ([maTonDau]),
  [maTonDau] int IDENTITY(1,1) NOT NULL,
  [nam] int NOT NULL,
  [maKho] varchar(30) NOT NULL,
  [nhomTB] varchar(20) NOT NULL,
  [maLoaiSPKT] varchar(30) NULL,
  [maTBDB] varchar(30) NULL,
  [soLuong] int NOT NULL,
  [nguonTao] varchar(20) NOT NULL DEFAULT ('KHOI_TAO'),
  [maChuyenKy] varchar(30) NULL,
  [ngayTao] datetime2 NOT NULL DEFAULT (sysdatetime()),
  [nguoiTao] nvarchar(100) NULL,
  [ghiChu] nvarchar(500) NULL,
  [maCCL] int NULL,
  CONSTRAINT [CK_TonDauKy_NhomTB] CHECK ([nhomTB]='TBDB' OR [nhomTB]='SPKT'),
  CONSTRAINT [CK_TonDauKy_SoLuong] CHECK ([soLuong]>=(0)),
  CONSTRAINT [CK_TonDauKy_DoiTuong] CHECK ([nhomTB]='SPKT' AND [maLoaiSPKT] IS NOT NULL AND [maTBDB] IS NULL OR [nhomTB]='TBDB' AND [maTBDB] IS NOT NULL AND [maLoaiSPKT] IS NULL),
  CONSTRAINT [CK_TonDauKy_NguonTao] CHECK ([nguonTao]='CHUYEN_KY' OR [nguonTao]='KHOI_TAO'),
  CONSTRAINT [CK_TonDauKy_NguonChuyenKy] CHECK ([nguonTao]='KHOI_TAO' AND [maChuyenKy] IS NULL OR [nguonTao]='CHUYEN_KY' AND [maChuyenKy] IS NOT NULL)
);

/* =========================================================
   VI. NGUOI DUNG, VAI TRO, PHAN QUYEN
   ========================================================= */

CREATE TABLE dbo.NguoiDung (
  CONSTRAINT [PK_NguoiDung] PRIMARY KEY ([maND]),
  [maND] int IDENTITY(1,1) NOT NULL,
  [tenDangNhap] varchar(50) NOT NULL,
  [matKhauHash] varchar(255) NOT NULL,
  [hoTen] nvarchar(200) NOT NULL,
  [maCapBac] varchar(20) NULL,
  [maChucVu] varchar(50) NULL,
  [maDonVi] varchar(30) NULL,
  [email] varchar(200) NULL,
  [soDienThoai] varchar(20) NULL,
  [avatarURL] varchar(500) NULL,
  [isActive] bit NOT NULL DEFAULT ((1)),
  [biKhoa] bit NOT NULL DEFAULT ((0)),
  [lyDoKhoa] nvarchar(500) NULL,
  [lanDangNhapCuoi] datetime2 NULL,
  [soLanSaiMK] int NOT NULL DEFAULT ((0)),
  [createdAt] datetime2 NOT NULL DEFAULT (sysdatetime()),
  [createdBy] int NULL,
  [updatedAt] datetime2 NULL,
  [updatedBy] int NULL,
  CONSTRAINT [UQ_NguoiDung] UNIQUE ([email]),
  CONSTRAINT [UQ_NguoiDung_2] UNIQUE ([tenDangNhap])
);

CREATE TABLE dbo.VaiTro (
  CONSTRAINT [PK_VaiTro] PRIMARY KEY ([maVaiTro]),
  [maVaiTro] varchar(50) NOT NULL,
  [tenVaiTro] nvarchar(200) NOT NULL,
  [moTa] nvarchar(500) NULL
);

CREATE TABLE dbo.NguoiDungVaiTro (
  CONSTRAINT [PK_NguoiDungVaiTro] PRIMARY KEY ([maNguoiDung], [maVaiTro]),
  [maNguoiDung] int NOT NULL,
  [maVaiTro] varchar(50) NOT NULL,
  [ghiChu] nvarchar(500) NULL
);

-- Refresh token (JWT access token sống ngắn 15 phút, refresh token sống dài 7 ngày để tự gia hạn
-- ngầm — xem TokenService.cs/AuthController.cs). Chỉ lưu hash (tokenHash), không lưu token gốc.
CREATE TABLE dbo.RefreshToken (
  CONSTRAINT [PK_RefreshToken] PRIMARY KEY ([maRefreshToken]),
  [maRefreshToken] bigint IDENTITY(1,1) NOT NULL,
  [maNguoiDung] int NOT NULL,
  [tokenHash] varchar(64) NOT NULL,
  [ngayTao] datetime2 NOT NULL DEFAULT (sysdatetime()),
  [ngayHetHan] datetime2 NOT NULL,
  [daThuHoi] bit NOT NULL DEFAULT ((0)),
  [ngayThuHoi] datetime2 NULL,
  CONSTRAINT [UQ_RefreshToken_TokenHash] UNIQUE ([tokenHash])
);

CREATE TABLE dbo.ChucNang (
  CONSTRAINT [PK_ChucNang] PRIMARY KEY ([maCN]),
  [maCN] varchar(50) NOT NULL,
  [tenCN] nvarchar(200) NOT NULL,
  [ghiChu] nvarchar(100) NULL
);

CREATE TABLE dbo.Quyen (
  CONSTRAINT [PK_Quyen] PRIMARY KEY ([maQuyen]),
  [maQuyen] int IDENTITY(1,1) NOT NULL,
  [tenQuyen] varchar(30) NOT NULL,
  [ghiChu] nvarchar(100) NULL,
  CONSTRAINT [UQ_Quyen] UNIQUE ([tenQuyen])
);

CREATE TABLE dbo.VaiTroChucNangQuyen (
  CONSTRAINT [PK_VTCNQ] PRIMARY KEY ([maVaiTro], [maQuyen], [maCN]),
  [maVaiTro] varchar(50) NOT NULL,
  [maQuyen] int NOT NULL,
  [maCN] varchar(50) NOT NULL
);

CREATE TABLE dbo.NhatKyHoatDong (
  CONSTRAINT [PK_NhatKyHoatDong] PRIMARY KEY ([id]),
  [id] bigint IDENTITY(1,1) NOT NULL,
  [maNguoiDung] int NULL,
  [tenDangNhap] varchar(50) NULL,
  [hanhDong] varchar(50) NOT NULL,
  [doiTuong] varchar(100) NULL,
  [maDoiTuong] varchar(50) NULL,
  [moTa] nvarchar(1000) NULL,
  [duLieuTruoc] nvarchar(MAX) NULL,
  [duLieuSau] nvarchar(MAX) NULL,
  [thoiGian] datetime2 NOT NULL DEFAULT (sysdatetime()),
  [ketQua] varchar(20) NOT NULL,
  [lyDoThatBai] nvarchar(500) NULL,
  CONSTRAINT [CK_NKHD_HanhDong] CHECK ([hanhDong]='PHE_DUYET' OR [hanhDong]='XOA' OR [hanhDong]='SUA' OR [hanhDong]='THEM' OR [hanhDong]='XEM' OR [hanhDong]='DANG_XUAT' OR [hanhDong]='DANG_NHAP'),
  CONSTRAINT [CK_NKHD_KetQua] CHECK ([ketQua]='THAT_BAI' OR [ketQua]='THANH_CONG')
);

GO

/* =========================================================
   VII. RANG BUOC KHOA NGOAI (thuc hien sau khi da co du bang)
   ========================================================= */

ALTER TABLE dbo.[ChiTietDongBo] ADD CONSTRAINT [FK_CTDB_NhomDongBo] FOREIGN KEY ([maKieuSPKT], [maLoaiTBDB]) REFERENCES dbo.[NhomDongBo] ([maKieuSPKT], [maLoaiTBDB]);
ALTER TABLE dbo.[ChiTietDongBo] ADD CONSTRAINT [FK_CTDB_TBDB] FOREIGN KEY ([maTBDB]) REFERENCES dbo.[TBDB] ([maTBDB]);
ALTER TABLE dbo.[ChiTietKiemKe] ADD CONSTRAINT [FK_CTKT_CCL] FOREIGN KEY ([maCCL]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[ChiTietKiemKe] ADD CONSTRAINT [FK_CTKT_LoaiSPKT] FOREIGN KEY ([maLoaiSPKT]) REFERENCES dbo.[LoaiSPKT] ([maLoai]);
ALTER TABLE dbo.[ChiTietKiemKe] ADD CONSTRAINT [FK_CTKT_Phieu] FOREIGN KEY ([maPhieuKiemKe]) REFERENCES dbo.[PhieuKiemKe] ([maPhieuKiemKe]);
ALTER TABLE dbo.[ChiTietKiemKe] ADD CONSTRAINT [FK_CTKT_TBDB] FOREIGN KEY ([maTBDB]) REFERENCES dbo.[TBDB] ([maTBDB]);
ALTER TABLE dbo.[ChiTietKiemKeViTri] ADD CONSTRAINT [FK_CTKTVT_CTKT] FOREIGN KEY ([maCTKiemKe]) REFERENCES dbo.[ChiTietKiemKe] ([maCTKiemKe]);
ALTER TABLE dbo.[ChiTietKiemKeViTri] ADD CONSTRAINT [FK_CTKTVT_LoTBDB] FOREIGN KEY ([maLoTBDB]) REFERENCES dbo.[LoTBDB] ([maLoTBDB]);
ALTER TABLE dbo.[ChiTietKiemKeViTri] ADD CONSTRAINT [FK_CTKTVT_TonKhoTBDB] FOREIGN KEY ([maTonKho]) REFERENCES dbo.[TonKhoTBDB] ([maTonKho]);
ALTER TABLE dbo.[ChiTietLenh] ADD CONSTRAINT [FK_CTL_CapChatLuong] FOREIGN KEY ([maCCL]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[ChiTietLenh] ADD CONSTRAINT [FK_CTL_Lenh] FOREIGN KEY ([maLenh]) REFERENCES dbo.[Lenh] ([maLenh]);
ALTER TABLE dbo.[ChiTietLenh] ADD CONSTRAINT [FK_CTL_LoaiSPKT] FOREIGN KEY ([maLoaiSPKT]) REFERENCES dbo.[LoaiSPKT] ([maLoai]);
ALTER TABLE dbo.[ChiTietLenh] ADD CONSTRAINT [FK_CTL_LoaiTBDB] FOREIGN KEY ([maLoaiTBDB]) REFERENCES dbo.[LoaiTBDB] ([maLoai]);
ALTER TABLE dbo.[ChiTietLenhChuyenCap] ADD CONSTRAINT [FK_CTLCC_CclCu] FOREIGN KEY ([maCclCu]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[ChiTietLenhChuyenCap] ADD CONSTRAINT [FK_CTLCC_CclMoi] FOREIGN KEY ([maCclMoi]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[ChiTietLenhChuyenCap] ADD CONSTRAINT [FK_CTLCC_Lenh] FOREIGN KEY ([maLenh]) REFERENCES dbo.[LenhChuyenCap] ([maLenh]);
ALTER TABLE dbo.[ChiTietLenhChuyenCap] ADD CONSTRAINT [FK_CTLCC_LoTBDB] FOREIGN KEY ([maLoTBDB]) REFERENCES dbo.[LoTBDB] ([maLoTBDB]);
ALTER TABLE dbo.[ChiTietLenhChuyenCap] ADD CONSTRAINT [FK_CTLCC_TonKhoTBDB] FOREIGN KEY ([maTonKho]) REFERENCES dbo.[TonKhoTBDB] ([maTonKho]);
ALTER TABLE dbo.[ChiTietLenhChuyenCap] ADD CONSTRAINT [FK_CTLCC_TrangThaiGoc] FOREIGN KEY ([trangThaiGoc]) REFERENCES dbo.[TrangThaiTB] ([maTTTB]);
ALTER TABLE dbo.[ChiTietLenhThayDoiHTNC] ADD CONSTRAINT [FK_CTLTDHTNC_HtncCu] FOREIGN KEY ([maHtncCu]) REFERENCES dbo.[HinhThucNiemCat] ([maHTNC]);
ALTER TABLE dbo.[ChiTietLenhThayDoiHTNC] ADD CONSTRAINT [FK_CTLTDHTNC_HtncMoi] FOREIGN KEY ([maHtncMoi]) REFERENCES dbo.[HinhThucNiemCat] ([maHTNC]);
ALTER TABLE dbo.[ChiTietLenhThayDoiHTNC] ADD CONSTRAINT [FK_CTLTDHTNC_Lenh] FOREIGN KEY ([maLenh]) REFERENCES dbo.[LenhThayDoiHTNC] ([maLenh]);
ALTER TABLE dbo.[ChiTietLenhThayDoiHTNC] ADD CONSTRAINT [FK_CTLTDHTNC_LoTBDB] FOREIGN KEY ([maLoTBDB]) REFERENCES dbo.[LoTBDB] ([maLoTBDB]);
ALTER TABLE dbo.[ChiTietLenhThayDoiHTNC] ADD CONSTRAINT [FK_CTLTDHTNC_TonKhoTBDB] FOREIGN KEY ([maTonKho]) REFERENCES dbo.[TonKhoTBDB] ([maTonKho]);
ALTER TABLE dbo.[ChiTietLenhThayDoiHTNC] ADD CONSTRAINT [FK_CTLTDHTNC_TrangThaiGoc] FOREIGN KEY ([trangThaiGoc]) REFERENCES dbo.[TrangThaiTB] ([maTTTB]);
ALTER TABLE dbo.[ChiTietLenhThayDoiViTri] ADD CONSTRAINT [FK_CTLenhThayDoiViTri_Lenh] FOREIGN KEY ([maLenh]) REFERENCES dbo.[LenhThayDoiViTri] ([maLenh]);
ALTER TABLE dbo.[ChiTietLenhThayDoiViTri] ADD CONSTRAINT [FK_CTLenhThayDoiViTri_Lo] FOREIGN KEY ([maLoTBDB]) REFERENCES dbo.[LoTBDB] ([maLoTBDB]);
ALTER TABLE dbo.[ChiTietLenhThayDoiViTri] ADD CONSTRAINT [FK_CTLenhThayDoiViTri_TonKho] FOREIGN KEY ([maTonKho]) REFERENCES dbo.[TonKhoTBDB] ([maTonKho]);
ALTER TABLE dbo.[ChiTietLenhThayDoiViTri] ADD CONSTRAINT [FK_CTLenhThayDoiViTri_TrangThaiGoc] FOREIGN KEY ([trangThaiGoc]) REFERENCES dbo.[TrangThaiTB] ([maTTTB]);
ALTER TABLE dbo.[ChiTietTCNX] ADD CONSTRAINT [FK_ChiTietTCNX_TCNX] FOREIGN KEY ([maNX]) REFERENCES dbo.[TinhChatNhapXuat] ([maNX]);
ALTER TABLE dbo.[ChuyenKy] ADD CONSTRAINT [FK_ChuyenKy_PhieuKK] FOREIGN KEY ([maPhieuKiemKe]) REFERENCES dbo.[PhieuKiemKe] ([maPhieuKiemKe]);
ALTER TABLE dbo.[CTDongBoTrongLenh] ADD CONSTRAINT [FK_CTDBTL_CapChatLuong] FOREIGN KEY ([maCCL]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[CTDongBoTrongLenh] ADD CONSTRAINT [FK_CTDBTL_Lenh] FOREIGN KEY ([maLenh]) REFERENCES dbo.[Lenh] ([maLenh]);
ALTER TABLE dbo.[CTDongBoTrongLenh] ADD CONSTRAINT [FK_CTDBTL_TBDB] FOREIGN KEY ([maTBDB]) REFERENCES dbo.[TBDB] ([maTBDB]);
ALTER TABLE dbo.[CTDongBoTrongLenh] ADD CONSTRAINT [FK_CTDBTL_TonKho] FOREIGN KEY ([maTonKho]) REFERENCES dbo.[TonKhoTBDB] ([maTonKho]);
ALTER TABLE dbo.[CTXuatKho] ADD CONSTRAINT [FK_CTXuatKho_CTDBTL] FOREIGN KEY ([maCTDongBoLenh]) REFERENCES dbo.[CTDongBoTrongLenh] ([maCTDongBoLenh]);
ALTER TABLE dbo.[CTXuatKho] ADD CONSTRAINT [FK_CTXuatKho_TonKho] FOREIGN KEY ([maTonKho]) REFERENCES dbo.[TonKhoTBDB] ([maTonKho]);
ALTER TABLE dbo.[HangSX] ADD CONSTRAINT [FK_HangSX_NSX] FOREIGN KEY ([maNSX]) REFERENCES dbo.[NSX] ([maNSX]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_CCL] FOREIGN KEY ([maCCL]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_DVT] FOREIGN KEY ([maDVT]) REFERENCES dbo.[DVT] ([maDVT]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_HTNC] FOREIGN KEY ([maHinhThucNiemCat]) REFERENCES dbo.[HinhThucNiemCat] ([maHTNC]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_Kho] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_LoaiSPKT] FOREIGN KEY ([maLoaiSPKT]) REFERENCES dbo.[LoaiSPKT] ([maLoai]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_NSX] FOREIGN KEY ([maNuocSX]) REFERENCES dbo.[NSX] ([maNSX]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_TrangThai] FOREIGN KEY ([maTrangThaiTB]) REFERENCES dbo.[TrangThaiTB] ([maTTTB]);
ALTER TABLE dbo.[HoSoSPKT] ADD CONSTRAINT [FK_HSSPKT_TTBG] FOREIGN KEY ([maTinhTrangBaoGoi]) REFERENCES dbo.[TinhTrangBaoGoi] ([maTTBG]);
ALTER TABLE dbo.[Kho] ADD CONSTRAINT [FK_Kho_CapQuanLy] FOREIGN KEY ([maCapQuanLy]) REFERENCES dbo.[CapQuanLy] ([maCapQuanLy]);
ALTER TABLE dbo.[Kho] ADD CONSTRAINT [FK_Kho_LoaiKho] FOREIGN KEY ([maLoaiKho]) REFERENCES dbo.[LoaiKho] ([maLoaiKho]);
ALTER TABLE dbo.[Kho] ADD CONSTRAINT [FK_Kho_Tinh] FOREIGN KEY ([maTinh]) REFERENCES dbo.[Tinh] ([maTinh]);
ALTER TABLE dbo.[Kho] ADD CONSTRAINT [FK_Kho_Xa] FOREIGN KEY ([maXa]) REFERENCES dbo.[Xa] ([maXa]);
ALTER TABLE dbo.[KieuSPKT] ADD CONSTRAINT [FK_KieuSPKT_NhomSPKT] FOREIGN KEY ([maNhom]) REFERENCES dbo.[NhomSPKT] ([maNhom]);
ALTER TABLE dbo.[KieuSPKT] ADD CONSTRAINT [FK_KieuSPKT_NSX] FOREIGN KEY ([maNSX]) REFERENCES dbo.[NSX] ([maNSX]);
ALTER TABLE dbo.[Lenh] ADD CONSTRAINT [FK_Lenh_ChiTietTCNX] FOREIGN KEY ([maLenhChiTiet]) REFERENCES dbo.[ChiTietTCNX] ([maCTNX]);
ALTER TABLE dbo.[Lenh] ADD CONSTRAINT [FK_Lenh_HTTT] FOREIGN KEY ([maHTTT]) REFERENCES dbo.[HTTT] ([maHTTT]);
ALTER TABLE dbo.[Lenh] ADD CONSTRAINT [FK_Lenh_KhoNhap] FOREIGN KEY ([maKhoNhap]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[Lenh] ADD CONSTRAINT [FK_Lenh_KhoXuat] FOREIGN KEY ([maKhoXuat]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[Lenh] ADD CONSTRAINT [FK_Lenh_NhaCungCap] FOREIGN KEY ([maNCC]) REFERENCES dbo.[NCC] ([maNCC]);
ALTER TABLE dbo.[Lenh] ADD CONSTRAINT [FK_Lenh_TinhChatNhapXuat] FOREIGN KEY ([maLoaiLenh]) REFERENCES dbo.[TinhChatNhapXuat] ([maNX]);
ALTER TABLE dbo.[LenhChuyenCap] ADD CONSTRAINT [FK_LenhChuyenCap_Kho] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[LenhThayDoiHTNC] ADD CONSTRAINT [FK_LenhThayDoiHTNC_Kho] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[LenhThayDoiViTri] ADD CONSTRAINT [FK_LenhThayDoiViTri_Kho] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[LoaiSPKT] ADD CONSTRAINT [FK_LoaiSPKT_KieuSPKT] FOREIGN KEY ([maKieu]) REFERENCES dbo.[KieuSPKT] ([maKieu]);
ALTER TABLE dbo.[LoaiSPKT] ADD CONSTRAINT [FK_LoaiSPKT_NhomSPKT] FOREIGN KEY ([maNhom]) REFERENCES dbo.[NhomSPKT] ([maNhom]);
ALTER TABLE dbo.[LoaiSPKT] ADD CONSTRAINT [FK_LoaiSPKT_NSX] FOREIGN KEY ([maNSX]) REFERENCES dbo.[NSX] ([maNSX]);
ALTER TABLE dbo.[LoTBDB] ADD CONSTRAINT [FK_LoTBDB_CCL] FOREIGN KEY ([maCCL]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[LoTBDB] ADD CONSTRAINT [FK_LoTBDB_CTDongBoLenh] FOREIGN KEY ([maCTDongBoLenh]) REFERENCES dbo.[CTDongBoTrongLenh] ([maCTDongBoLenh]);
ALTER TABLE dbo.[LoTBDB] ADD CONSTRAINT [FK_LoTBDB_HinhThucNiemCat] FOREIGN KEY ([maHinhThucNiemCat]) REFERENCES dbo.[HinhThucNiemCat] ([maHTNC]);
ALTER TABLE dbo.[LoTBDB] ADD CONSTRAINT [FK_LoTBDB_NuocSX] FOREIGN KEY ([maNuocSX]) REFERENCES dbo.[NSX] ([maNSX]);
ALTER TABLE dbo.[LoTBDB] ADD CONSTRAINT [FK_LoTBDB_TBDB] FOREIGN KEY ([maTBDB]) REFERENCES dbo.[TBDB] ([maTBDB]);
ALTER TABLE dbo.[LoTBDB] ADD CONSTRAINT [FK_LoTBDB_TinhTrangBaoGoi] FOREIGN KEY ([maTinhTrangBaoGoi]) REFERENCES dbo.[TinhTrangBaoGoi] ([maTTBG]);
ALTER TABLE dbo.[NCC] ADD CONSTRAINT [FK_NCC_NSX] FOREIGN KEY ([maNSX]) REFERENCES dbo.[NSX] ([maNSX]);
ALTER TABLE dbo.[NguoiDung] ADD CONSTRAINT [FK_ND_CapBac] FOREIGN KEY ([maCapBac]) REFERENCES dbo.[CapBac] ([maCapBac]);
ALTER TABLE dbo.[NguoiDung] ADD CONSTRAINT [FK_ND_ChucVu] FOREIGN KEY ([maChucVu]) REFERENCES dbo.[ChucVu] ([maChucVu]);
ALTER TABLE dbo.[NguoiDung] ADD CONSTRAINT [FK_ND_CreatedBy] FOREIGN KEY ([createdBy]) REFERENCES dbo.[NguoiDung] ([maND]);
ALTER TABLE dbo.[NguoiDung] ADD CONSTRAINT [FK_ND_DonVi] FOREIGN KEY ([maDonVi]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[NguoiDung] ADD CONSTRAINT [FK_ND_UpdatedBy] FOREIGN KEY ([updatedBy]) REFERENCES dbo.[NguoiDung] ([maND]);
ALTER TABLE dbo.[NguoiDungVaiTro] ADD CONSTRAINT [FK_NDVT_ND] FOREIGN KEY ([maNguoiDung]) REFERENCES dbo.[NguoiDung] ([maND]);
ALTER TABLE dbo.[NguoiDungVaiTro] ADD CONSTRAINT [FK_NDVT_VT] FOREIGN KEY ([maVaiTro]) REFERENCES dbo.[VaiTro] ([maVaiTro]);
ALTER TABLE dbo.[NhaKho] ADD CONSTRAINT [FK_NhaKho_Kho] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[NhatKyHoatDong] ADD CONSTRAINT [FK_NKHD_ND] FOREIGN KEY ([maNguoiDung]) REFERENCES dbo.[NguoiDung] ([maND]);
ALTER TABLE dbo.[NhomDongBo] ADD CONSTRAINT [FK_NDB_Kieu] FOREIGN KEY ([maKieuSPKT]) REFERENCES dbo.[KieuSPKT] ([maKieu]);
ALTER TABLE dbo.[NhomDongBo] ADD CONSTRAINT [FK_NDB_LoaiTBDB] FOREIGN KEY ([maLoaiTBDB]) REFERENCES dbo.[LoaiTBDB] ([maLoai]);
ALTER TABLE dbo.[PhieuKiemKe] ADD CONSTRAINT [FK_PhieuKK_DonVi] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[PhieuKiemKe] ADD CONSTRAINT [FK_PhieuKK_DotKK] FOREIGN KEY ([maDotKiemKe]) REFERENCES dbo.[DotKiemKe] ([maDotKiemKe]);
ALTER TABLE dbo.[RefreshToken] ADD CONSTRAINT [FK_RefreshToken_NguoiDung] FOREIGN KEY ([maNguoiDung]) REFERENCES dbo.[NguoiDung] ([maND]);
ALTER TABLE dbo.[SPKTTrongLenh] ADD CONSTRAINT [FK_SPKTTL_CCL] FOREIGN KEY ([maCCL]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[SPKTTrongLenh] ADD CONSTRAINT [FK_SPKTTL_CTL] FOREIGN KEY ([maCTLenh]) REFERENCES dbo.[ChiTietLenh] ([maCTLenh]);
ALTER TABLE dbo.[SPKTTrongLenh] ADD CONSTRAINT [FK_SPKTTL_HTNC] FOREIGN KEY ([hinhThucNiemCat]) REFERENCES dbo.[HinhThucNiemCat] ([maHTNC]);
ALTER TABLE dbo.[SPKTTrongLenh] ADD CONSTRAINT [FK_SPKTTL_Loai] FOREIGN KEY ([maLoaiSPKT]) REFERENCES dbo.[LoaiSPKT] ([maLoai]);
ALTER TABLE dbo.[SPKTTrongLenh] ADD CONSTRAINT [FK_SPKTTL_NSX] FOREIGN KEY ([maNuocSX]) REFERENCES dbo.[NSX] ([maNSX]);
ALTER TABLE dbo.[SPKTTrongLenh] ADD CONSTRAINT [FK_SPKTTL_TrangThai] FOREIGN KEY ([maTrangThaiTB]) REFERENCES dbo.[TrangThaiTB] ([maTTTB]);
ALTER TABLE dbo.[SPKTTrongLenh] ADD CONSTRAINT [FK_SPKTTL_TTBG] FOREIGN KEY ([maTinhTrangBaoGoi]) REFERENCES dbo.[TinhTrangBaoGoi] ([maTTBG]);
ALTER TABLE dbo.[TBDB] ADD CONSTRAINT [FK_TBDB_DVT] FOREIGN KEY ([maDVT]) REFERENCES dbo.[DVT] ([maDVT]);
ALTER TABLE dbo.[TBDB] ADD CONSTRAINT [FK_TBDB_Loai] FOREIGN KEY ([maLoaiTBDB]) REFERENCES dbo.[LoaiTBDB] ([maLoai]);
ALTER TABLE dbo.[TonDauKy] ADD CONSTRAINT [FK_TonDauKy_CCL] FOREIGN KEY ([maCCL]) REFERENCES dbo.[CapChatLuong] ([maCap]);
ALTER TABLE dbo.[TonDauKy] ADD CONSTRAINT [FK_TonDauKy_ChuyenKy] FOREIGN KEY ([maChuyenKy]) REFERENCES dbo.[ChuyenKy] ([maChuyenKy]);
ALTER TABLE dbo.[TonDauKy] ADD CONSTRAINT [FK_TonDauKy_Kho] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[TonDauKy] ADD CONSTRAINT [FK_TonDauKy_LoaiSPKT] FOREIGN KEY ([maLoaiSPKT]) REFERENCES dbo.[LoaiSPKT] ([maLoai]);
ALTER TABLE dbo.[TonDauKy] ADD CONSTRAINT [FK_TonDauKy_TBDB] FOREIGN KEY ([maTBDB]) REFERENCES dbo.[TBDB] ([maTBDB]);
ALTER TABLE dbo.[TonKhoTBDB] ADD CONSTRAINT [FK_TonKhoTBDB_Kho] FOREIGN KEY ([maKho]) REFERENCES dbo.[Kho] ([maKho]);
ALTER TABLE dbo.[TonKhoTBDB] ADD CONSTRAINT [FK_TonKhoTBDB_LoTBDB] FOREIGN KEY ([maLoTBDB]) REFERENCES dbo.[LoTBDB] ([maLoTBDB]);
ALTER TABLE dbo.[TonKhoTBDB] ADD CONSTRAINT [FK_TonKhoTBDB_TrangThai] FOREIGN KEY ([maTrangThaiTB]) REFERENCES dbo.[TrangThaiTB] ([maTTTB]);
ALTER TABLE dbo.[VaiTroChucNangQuyen] ADD CONSTRAINT [FK_VTCNQ_CN] FOREIGN KEY ([maCN]) REFERENCES dbo.[ChucNang] ([maCN]);
ALTER TABLE dbo.[VaiTroChucNangQuyen] ADD CONSTRAINT [FK_VTCNQ_Q] FOREIGN KEY ([maQuyen]) REFERENCES dbo.[Quyen] ([maQuyen]);
ALTER TABLE dbo.[VaiTroChucNangQuyen] ADD CONSTRAINT [FK_VTCNQ_VT] FOREIGN KEY ([maVaiTro]) REFERENCES dbo.[VaiTro] ([maVaiTro]);
ALTER TABLE dbo.[Xa] ADD CONSTRAINT [FK_Xa_Tinh] FOREIGN KEY ([maTinh]) REFERENCES dbo.[Tinh] ([maTinh]);
GO


