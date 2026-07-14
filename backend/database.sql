-- Tạo database
CREATE DATABASE QuanLyVuKhi;
GO

USE QuanLyVuKhi;
GO

-- Bảng tài khoản người dùng
CREATE TABLE TaiKhoan (
    ID INT PRIMARY KEY IDENTITY(1,1),
    TenDangNhap NVARCHAR(50) NOT NULL UNIQUE,
    HoTen NVARCHAR(100) NOT NULL,
    MatKhau NVARCHAR(255) NOT NULL,
    VaiTro NVARCHAR(50) NOT NULL DEFAULT 'NhanVien', -- Admin, QuanLy, NhanVien
    TrangThai BIT NOT NULL DEFAULT 1,
    NgayTao DATETIME DEFAULT GETDATE()
);
GO

-- Danh mục đơn vị
CREATE TABLE DanhMucDonVi (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaDonVi NVARCHAR(20),
    TenDonVi NVARCHAR(200) NOT NULL,
    GhiChu NVARCHAR(500)
);
GO

-- Danh mục cấp bậc
CREATE TABLE DanhMucCapBac (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaCapBac NVARCHAR(20),
    TenCapBac NVARCHAR(100) NOT NULL
);
GO

-- Danh mục chức vụ
CREATE TABLE DanhMucChucVu (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaChucVu NVARCHAR(20),
    TenChucVu NVARCHAR(100) NOT NULL
);
GO

-- Danh mục tổ chức và nhân sự
CREATE TABLE DanhMucToChucNhanSu (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaToChuc NVARCHAR(20),
    TenToChuc NVARCHAR(200) NOT NULL
);
GO

-- Danh mục tổ chức kho
CREATE TABLE DanhMucToChucKho (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaKho NVARCHAR(20),
    TenKho NVARCHAR(200) NOT NULL,
    DiaDiem NVARCHAR(300)
);
GO

-- Danh mục từ điển TBN1
CREATE TABLE DanhMucTuDienTBN1 (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaTuDien NVARCHAR(20),
    TenTuDien NVARCHAR(200) NOT NULL,
    GhiChu NVARCHAR(500)
);
GO

-- Danh mục từ điển TBN2
CREATE TABLE DanhMucTuDienTBN2 (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaTuDien NVARCHAR(20),
    TenTuDien NVARCHAR(200) NOT NULL,
    GhiChu NVARCHAR(500)
);
GO

-- Danh mục từ điển dùng chung
CREATE TABLE DanhMucTuDienDungChung (
    ID INT PRIMARY KEY IDENTITY(1,1),
    MaTuDien NVARCHAR(20),
    TenTuDien NVARCHAR(200) NOT NULL,
    GhiChu NVARCHAR(500)
);
GO

-- Tài khoản Admin mặc định (mật khẩu: Admin@123)
INSERT INTO TaiKhoan (TenDangNhap, HoTen, MatKhau, VaiTro)
VALUES ('admin', N'Quản trị viên', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');
GO
