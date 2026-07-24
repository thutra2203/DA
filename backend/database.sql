
/*
    CSDL: QuanLyKhoQuanKhi
    Hệ quản trị: Microsoft SQL Server

    Nguồn thiết kế: tài liệu "ĐỒ ÁN CỦA TRÀ.docx".

    Các điều chỉnh kỹ thuật cần thiết để script chạy được:
    1. Bổ sung bảng DONVI vì tài liệu có nhiều khóa maDonVi nhưng không định nghĩa bảng DONVI.
    2. Chuẩn hóa kiểu dữ liệu khóa ngoại bị lệch trong tài liệu:
       - XA.maTinh dùng VARCHAR(5), đồng nhất với TINH.maTinh.
       - KHO.maLoaiKho dùng VARCHAR(30), đồng nhất với LOAIKHO.maLoaiKho.
       - VaiTro dùng VARCHAR(50) và các bảng liên kết dùng cùng kiểu.
       - maCN trong VaiTroChucNangQuyen dùng VARCHAR(50), không dùng DATETIME.
       - Các mã hình thức niêm cất, tình trạng bao gói dùng VARCHAR(20).
    3. Bổ sung khóa chính cho các bảng mà tài liệu chưa ghi rõ.
    4. Cột "ĐVT" được chuẩn hóa thành maDVT để thuận tiện tạo khóa ngoại.
    5. Thêm SET QUOTED_IDENTIFIER ON / SET ANSI_NULLS ON — bắt buộc để tạo được các cột
       tính toán PERSISTED (thanhTien, thua, thieu...) trong HoSoSPKT/TBDB/SPKTTrongLenh/...
*/

SET NOCOUNT ON;
GO

IF DB_ID(N'QuanLyKhoQuanKhi') IS NULL
BEGIN
    CREATE DATABASE QuanLyKhoQuanKhi;
END;
GO

USE QuanLyKhoQuanKhi;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO




/* =========================================================
   I. DANH MỤC HỆ THỐNG
   ========================================================= */

CREATE TABLE NhomSPKT (
    maNhom      VARCHAR(30)    NOT NULL PRIMARY KEY,
    tenNhom     NVARCHAR(200)  NOT NULL,
    moTa        NVARCHAR(500)  NULL,
    CONSTRAINT UQ_NhomSPKT_tenNhom UNIQUE (tenNhom)
);

CREATE TABLE LoaiSPKT (
    maLoai      VARCHAR(30)    NOT NULL PRIMARY KEY,
    maNhom      VARCHAR(30)    NOT NULL,
    tenLoai     NVARCHAR(100)  NOT NULL,
    co          VARCHAR(20)    NULL,
    kiHieu      VARCHAR(30)    NULL,
    nuocSX      NVARCHAR(50)   NULL,
    maDVT       VARCHAR(20)    NULL,
    ghiChu      NVARCHAR(200)  NULL,
    CONSTRAINT FK_LoaiSPKT_NhomSPKT FOREIGN KEY (maNhom) REFERENCES NhomSPKT(maNhom)
);

CREATE TABLE KieuSPKT (
    maKieu      VARCHAR(30)    NOT NULL PRIMARY KEY,
    tenKieu     NVARCHAR(200)  NOT NULL,
    nuocSX      NVARCHAR(100)  NULL,
    maDVT       VARCHAR(20)    NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE LoaiTBThuocKieu (
    maKieu      VARCHAR(30)    NOT NULL,
    maLoaiSPKT  VARCHAR(30)    NOT NULL,
    CONSTRAINT PK_LoaiTBThuocKieu PRIMARY KEY (maKieu, maLoaiSPKT),
    CONSTRAINT FK_LTBK_KieuSPKT FOREIGN KEY (maKieu) REFERENCES KieuSPKT(maKieu),
    CONSTRAINT FK_LTBK_LoaiSPKT FOREIGN KEY (maLoaiSPKT) REFERENCES LoaiSPKT(maLoai)
);

CREATE TABLE LoaiTBDB (
    maLoai      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenLoai     NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE CapChatLuong (
    maCap       INT            NOT NULL PRIMARY KEY,
    tenCap      NVARCHAR(100)  NOT NULL,
    moTa        NVARCHAR(500)  NULL,
    CONSTRAINT CK_CapChatLuong_maCap CHECK (maCap BETWEEN 1 AND 5)
);

CREATE TABLE DVT (
    maDVT       VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenDVT      NVARCHAR(200)  NOT NULL,
    donViCoBan  VARCHAR(20)    NULL,
    heSoCoBan   FLOAT          NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE NSX (
    maNSX       VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenNSX      NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE HangSX (
    maHSX       VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenHSX      NVARCHAR(100)  NOT NULL,
    diaChi      NVARCHAR(200)  NULL,
    email       VARCHAR(100)   NULL,
    SDT         VARCHAR(20)    NULL,
    ghiChu      NVARCHAR(200)  NULL,
    maNSX       VARCHAR(20)    NULL,
    CONSTRAINT FK_HangSX_NSX FOREIGN KEY (maNSX) REFERENCES NSX(maNSX)
);

CREATE TABLE NCC (
    maNCC       VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenNCC      NVARCHAR(100)  NOT NULL,
    diaChi      NVARCHAR(200)  NULL,
    email       VARCHAR(100)   NULL,
    SDT         VARCHAR(20)    NULL,
    ghiChu      NVARCHAR(200)  NULL,
    maNSX       VARCHAR(20)    NULL,
    CONSTRAINT FK_NCC_NSX FOREIGN KEY (maNSX) REFERENCES NSX(maNSX)
);

CREATE TABLE HTTT (
    maHTTT      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenHTTT     NVARCHAR(100)  NOT NULL,
    mucPhi      DECIMAL(18,2)  NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE HTVanChuyen (
    maHTVC      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenHTVC     NVARCHAR(100)  NOT NULL,
    mucPhi      DECIMAL(18,2)  NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE LoaiTBBD (
    maLoai      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenLoai     NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE TinhChatNhapXuat (
    maNX        VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenNX       NVARCHAR(200)  NOT NULL,
    nhomTB      VARCHAR(50)   NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE ChiTietTCNX (
    maCTNX      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenCTNX     NVARCHAR(200)  NOT NULL,
    maNX        VARCHAR(20)    NOT NULL,
    ghiChu      NVARCHAR(200)  NULL,
    CONSTRAINT FK_ChiTietTCNX_TCNX FOREIGN KEY (maNX) REFERENCES TinhChatNhapXuat(maNX)
);

CREATE TABLE HinhThucNiemCat (
    maHTNC      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenHTNC     NVARCHAR(100)  NOT NULL
);

CREATE TABLE TinhTrangBaoGoi (
    maTTBG      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenTTBG     NVARCHAR(200)  NOT NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE TrangThaiTB (
    maTTTB      VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenTTTB     NVARCHAR(200)  NOT NULL,
    ghiChu      NVARCHAR(200)  NULL
);

CREATE TABLE CapBac (
    maCapBac    VARCHAR(20)    NOT NULL PRIMARY KEY,
    tenCapBac   NVARCHAR(100)  NOT NULL,
    thuTu       INT            NULL  
);

CREATE TABLE ChucVu (
    maChucVu    VARCHAR(50)    NOT NULL PRIMARY KEY,
    tenChucVu   NVARCHAR(200)  NOT NULL,
    moTa        NVARCHAR(500)  NULL
);

CREATE TABLE Tinh (
    maTinh      VARCHAR(5)     NOT NULL PRIMARY KEY,
    tenTinh     NVARCHAR(100)  NOT NULL,
    vungMien    VARCHAR(10)    NULL,
    ghiChu      NVARCHAR(200)  NULL,
    CONSTRAINT CK_Tinh_vungMien CHECK (vungMien IN ('BAC','TRUNG','NAM'))
);

CREATE TABLE Xa (
    maXa        VARCHAR(6)     NOT NULL PRIMARY KEY,
    maTinh      VARCHAR(5)     NOT NULL,
    tenXa       NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(150)  NULL,
    CONSTRAINT FK_Xa_Tinh FOREIGN KEY (maTinh) REFERENCES Tinh(maTinh)
);



/* =========================================================
   II. TỔ CHỨC ĐƠN VỊ VÀ KHO BÃI
   ========================================================= */

CREATE TABLE LoaiKho (
    maLoaiKho   VARCHAR(30)    NOT NULL PRIMARY KEY,
    tenLoaiKho  NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(500)  NULL
);

CREATE TABLE Kho (
    maKho       VARCHAR(30)    NOT NULL PRIMARY KEY,
    maLoaiKho   VARCHAR(30)    NOT NULL,
    tenKho      NVARCHAR(200)  NOT NULL,
    dienTich    DECIMAL(10,2)  NULL,
    diaChi      NVARCHAR(200)  NULL,
    maXa        VARCHAR(6)     NULL,
    maTinh      VARCHAR(5)     NULL,
    ghiChu      NVARCHAR(500)  NULL,
    CONSTRAINT FK_Kho_LoaiKho FOREIGN KEY (maLoaiKho) REFERENCES LoaiKho(maLoaiKho),
    CONSTRAINT FK_Kho_Xa FOREIGN KEY (maXa) REFERENCES Xa(maXa),
    CONSTRAINT FK_Kho_Tinh FOREIGN KEY (maTinh) REFERENCES Tinh(maTinh)
);

CREATE TABLE NhaKho (
    maNhaKho    VARCHAR(30)    NOT NULL PRIMARY KEY,
    maKho       VARCHAR(30)    NOT NULL,
    tenNhaKho   NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(500)  NULL,
    CONSTRAINT FK_NhaKho_Kho FOREIGN KEY (maKho) REFERENCES Kho(maKho)
);

CREATE TABLE DinhKhu (
    maDinhKhu   VARCHAR(30)    NOT NULL PRIMARY KEY,
    maNhaKho    VARCHAR(30)    NOT NULL,
    tenDinhKhu  NVARCHAR(200)  NOT NULL,
    ghiChu      NVARCHAR(300)  NULL,
    CONSTRAINT FK_DinhKhu_NhaKho FOREIGN KEY (maNhaKho) REFERENCES NhaKho(maNhaKho)
);

CREATE TABLE KhoiHang (
    maKhoi      VARCHAR(30)    NOT NULL PRIMARY KEY,
    maDinhKhu   VARCHAR(30)    NOT NULL,
    tenKhoi     NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(300)  NULL,
    CONSTRAINT FK_KhoiHang_DinhKhu FOREIGN KEY (maDinhKhu) REFERENCES DinhKhu(maDinhKhu)
);

CREATE TABLE GiaHang (
    maGia       VARCHAR(30)    NOT NULL PRIMARY KEY,
    maKhoi      VARCHAR(30)    NOT NULL,
    tenGia      NVARCHAR(100)  NOT NULL,
    ghiChu      NVARCHAR(300)  NULL,
    CONSTRAINT FK_GiaHang_KhoiHang FOREIGN KEY (maKhoi) REFERENCES KhoiHang(maKhoi)
);

CREATE TABLE Tang (
    maTang      VARCHAR(30)    NOT NULL PRIMARY KEY,
    maGia       VARCHAR(30)    NOT NULL,
    soTang      INT            NOT NULL,
    ghiChu      NVARCHAR(300)  NULL,
    CONSTRAINT FK_Tang_GiaHang FOREIGN KEY (maGia) REFERENCES GiaHang(maGia),
    CONSTRAINT UQ_Tang_Gia_soTang UNIQUE (maGia, soTang)
);

CREATE TABLE Hom (
    maHom       VARCHAR(30)    NOT NULL PRIMARY KEY,
    maTang      VARCHAR(30)    NOT NULL,
    ghiChu      NVARCHAR(300)  NULL,
    CONSTRAINT FK_Hom_Tang FOREIGN KEY (maTang) REFERENCES Tang(maTang)
);

/* =========================================================
   III. ĐỒNG BỘ, HỒ SƠ SPKT VÀ TBDB
   ========================================================= */

CREATE TABLE NhomDongBo (
    maKieuSPKT  VARCHAR(30)    NOT NULL,
    maLoaiTBDB  VARCHAR(20)    NOT NULL,
    ghiChu      NVARCHAR(200)  NULL,
    CONSTRAINT PK_NhomDongBo PRIMARY KEY (maKieuSPKT, maLoaiTBDB),
    CONSTRAINT FK_NDB_Kieu FOREIGN KEY (maKieuSPKT) REFERENCES KieuSPKT(maKieu),
    CONSTRAINT FK_NDB_LoaiTBDB FOREIGN KEY (maLoaiTBDB) REFERENCES LoaiTBDB(maLoai)
);

CREATE TABLE TBDB (
    maTBDB              VARCHAR(30)     NOT NULL PRIMARY KEY,
    maLoaiTBDB          VARCHAR(20)     NOT NULL,
	tenTBDB				NVARCHAR(100) NULL,
    namSX               INT             NULL,
    maNuocSX            VARCHAR(20)     NULL,
    maCCL               INT             NULL,
    maDVT               VARCHAR(20)     NULL,
    maHinhThucNiemCat     VARCHAR(20)     NULL,
    maTinhTrangBaoGoi   VARCHAR(20)     NULL,
    maKho               VARCHAR(30)     NULL,
    maNhaKho            VARCHAR(30)     NULL,
    maKhu               VARCHAR(30)     NULL,
    maKhoi              VARCHAR(30)     NULL,
    maTang              VARCHAR(30)     NULL,
    maHom               VARCHAR(30)     NULL,
    maTrangThaiTB       VARCHAR(20)     NULL,
    viTri               NVARCHAR(500)   NULL,
    soLuong             INT             NOT NULL DEFAULT 0,
    donGia              DECIMAL(18,2)   NULL,
    thanhTien           AS (ISNULL(soLuong,0) * ISNULL(donGia,0)) PERSISTED,
    ghiChu              NVARCHAR(1000)  NULL,
    thoiGianTao         DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    capNhatMoiNhat      DATETIME2       NULL,
    CONSTRAINT FK_TBDB_Loai FOREIGN KEY (maLoaiTBDB) REFERENCES LoaiTBDB(maLoai),
    CONSTRAINT FK_TBDB_NSX FOREIGN KEY (maNuocSX) REFERENCES NSX(maNSX),
    CONSTRAINT FK_TBDB_CCL FOREIGN KEY (maCCL) REFERENCES CapChatLuong(maCap),
    CONSTRAINT FK_TBDB_DVT FOREIGN KEY (maDVT) REFERENCES DVT(maDVT),
    CONSTRAINT FK_TBDB_HTNC FOREIGN KEY (maHinhThucNiemCat) REFERENCES HinhThucNiemCat(maHTNC),
    CONSTRAINT FK_TBDB_TTBG FOREIGN KEY (maTinhTrangBaoGoi) REFERENCES TinhTrangBaoGoi(maTTBG),
    CONSTRAINT FK_TBDB_Kho FOREIGN KEY (maKho) REFERENCES Kho(maKho),
    CONSTRAINT FK_TBDB_NhaKho FOREIGN KEY (maNhaKho) REFERENCES NhaKho(maNhaKho),
    CONSTRAINT FK_TBDB_DinhKhu FOREIGN KEY (maKhu) REFERENCES DinhKhu(maDinhKhu),
    CONSTRAINT FK_TBDB_Khoi FOREIGN KEY (maKhoi) REFERENCES KhoiHang(maKhoi),
    CONSTRAINT FK_TBDB_Tang FOREIGN KEY (maTang) REFERENCES Tang(maTang),
    CONSTRAINT FK_TBDB_Hom FOREIGN KEY (maHom) REFERENCES Hom(maHom),
    CONSTRAINT FK_TBDB_TrangThai FOREIGN KEY (maTrangThaiTB) REFERENCES TrangThaiTB(maTTTB)
);

CREATE TABLE ChiTietDongBo (
    maKieuSPKT      VARCHAR(30)    NOT NULL,
    maLoaiTBDB      VARCHAR(20)    NOT NULL,
    maTBDB          VARCHAR(30)    NOT NULL,
    soLuongSPKTCoSo INT            NOT NULL DEFAULT 1,
    SLDinhMuc       INT            NOT NULL,
    ghiChu          NVARCHAR(200)  NULL,


    CONSTRAINT PK_ChiTietDongBo
        PRIMARY KEY (maKieuSPKT, maLoaiTBDB, maTBDB),


    CONSTRAINT FK_CTDB_NhomDongBo
        FOREIGN KEY (maKieuSPKT, maLoaiTBDB)
        REFERENCES NhomDongBo(maKieuSPKT, maLoaiTBDB),

    -- Trang bị đồng bộ
    CONSTRAINT FK_CTDB_TBDB
        FOREIGN KEY (maTBDB)
        REFERENCES TBDB(maTBDB),

    -- Ràng buộc dữ liệu
    CONSTRAINT CK_CTDB_SoLuongSPKTCoSo
        CHECK (soLuongSPKTCoSo > 0),

    CONSTRAINT CK_CTDB_SLDinhMuc
        CHECK (SLDinhMuc >= 0)
);

CREATE TABLE HoSoSPKT (
    soHieu              VARCHAR(30)     NOT NULL PRIMARY KEY,
    maLoaiSPKT          VARCHAR(30)     NOT NULL,
    namSX               INT             NULL,
    maNuocSX            VARCHAR(20)     NULL,
    maCCL               INT             NULL,
    maDVT               VARCHAR(20)     NULL,
    maHinhThucNiemCat     VARCHAR(20)     NULL,
    maTinhTrangBaoGoi   VARCHAR(20)     NULL,
    maKho               VARCHAR(30)     NULL,
    maNhaKho            VARCHAR(30)     NULL,
    maKhu               VARCHAR(30)     NULL,
    maKhoi              VARCHAR(30)     NULL,
    maTang              VARCHAR(30)     NULL,
    maHom               VARCHAR(30)     NULL,
    maTrangThaiTB       VARCHAR(20)     NULL,
    viTri               NVARCHAR(500)   NULL,
    soLuong             INT             NOT NULL DEFAULT 0,
    donGia              DECIMAL(18,2)   NULL,
    thanhTien           AS (ISNULL(soLuong,0) * ISNULL(donGia,0)) PERSISTED,
    ghiChu              NVARCHAR(1000)  NULL,
    thoiGianTao         DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    capNhatMoiNhat      DATETIME2       NULL,
    CONSTRAINT FK_HSSPKT_LoaiSPKT FOREIGN KEY (maLoaiSPKT) REFERENCES LoaiSPKT(maLoai),
    CONSTRAINT FK_HSSPKT_NSX FOREIGN KEY (maNuocSX) REFERENCES NSX(maNSX),
    CONSTRAINT FK_HSSPKT_CCL FOREIGN KEY (maCCL) REFERENCES CapChatLuong(maCap),
    CONSTRAINT FK_HSSPKT_DVT FOREIGN KEY (maDVT) REFERENCES DVT(maDVT),
    CONSTRAINT FK_HSSPKT_HTNC FOREIGN KEY (maHinhThucNiemCat) REFERENCES HinhThucNiemCat(maHTNC),
    CONSTRAINT FK_HSSPKT_TTBG FOREIGN KEY (maTinhTrangBaoGoi) REFERENCES TinhTrangBaoGoi(maTTBG),
    CONSTRAINT FK_HSSPKT_Kho FOREIGN KEY (maKho) REFERENCES Kho(maKho),
    CONSTRAINT FK_HSSPKT_NhaKho FOREIGN KEY (maNhaKho) REFERENCES NhaKho(maNhaKho),
    CONSTRAINT FK_HSSPKT_DinhKhu FOREIGN KEY (maKhu) REFERENCES DinhKhu(maDinhKhu),
    CONSTRAINT FK_HSSPKT_Khoi FOREIGN KEY (maKhoi) REFERENCES KhoiHang(maKhoi),
    CONSTRAINT FK_HSSPKT_Tang FOREIGN KEY (maTang) REFERENCES Tang(maTang),
    CONSTRAINT FK_HSSPKT_Hom FOREIGN KEY (maHom) REFERENCES Hom(maHom),
    CONSTRAINT FK_HSSPKT_TrangThai FOREIGN KEY (maTrangThaiTB) REFERENCES TrangThaiTB(maTTTB)
);

/* =========================================================
   IV. LỆNH NHẬP XUẤT
   ========================================================= */

CREATE TABLE Lenh (
    maLenh          VARCHAR(30)     NOT NULL PRIMARY KEY,
    maLoaiLenh      VARCHAR(20)     NOT NULL,
    maLenhChiTiet   VARCHAR(20)     NULL,
    ngay             DATE            NOT NULL,
    ngayHieuLuc      DATE            NULL,
    giaTriDenNgay    DATE            NULL,
    trangThai        VARCHAR(30)     NULL,
    canCu            NVARCHAR(200)   NULL,
    veViec           NVARCHAR(200)   NULL,
    maHTTT           VARCHAR(20)     NULL,
    maKhoNhap      VARCHAR(30)     NULL,
    maKhoXuat      VARCHAR(30)     NULL,
    ptVanChuyen      NVARCHAR(100)   NULL,
    nguoiTao         NVARCHAR(200)   NULL,
    ghiChu           NVARCHAR(1000)  NULL,
	
	CONSTRAINT FK_Lenh_TinhChatNhapXuat
        FOREIGN KEY (maLoaiLenh)
        REFERENCES TinhChatNhapXuat(maNX),

    CONSTRAINT FK_Lenh_ChiTietTCNX
        FOREIGN KEY (maLenhChiTiet)
        REFERENCES ChiTietTCNX(maCTNX),

    CONSTRAINT FK_Lenh_HTTT FOREIGN KEY (maHTTT) REFERENCES HTTT(maHTTT),
    CONSTRAINT FK_Lenh_KhoNhap FOREIGN KEY (maKhoNhap) REFERENCES Kho(maKho),
    CONSTRAINT FK_Lenh_KhoXuat FOREIGN KEY (maKhoXuat) REFERENCES Kho(maKho)
);

CREATE TABLE ChiTietLenh (
    maCTLenh      INT IDENTITY(1,1) PRIMARY KEY   NOT NULL ,
    maLenh       VARCHAR(30)   NOT NULL,
    maLoaiSPKT   VARCHAR(30)   NULL,
    maLoaiTBDB   VARCHAR(20)   NULL,
    maCCL        INT   NULL,
    soLuong      INT           NOT NULL,
    slThuc       INT           NULL,
    ghiChu       NVARCHAR(500) NULL,

  
    CONSTRAINT FK_CTL_Lenh
        FOREIGN KEY (maLenh)
        REFERENCES Lenh(maLenh),

    CONSTRAINT FK_CTL_LoaiSPKT
        FOREIGN KEY (maLoaiSPKT)
        REFERENCES LoaiSPKT(maLoai),

    CONSTRAINT FK_CTL_LoaiTBDB
        FOREIGN KEY (maLoaiTBDB)
        REFERENCES LoaiTBDB(maLoai),

    CONSTRAINT FK_CTL_CapChatLuong
        FOREIGN KEY (maCCL)
        REFERENCES CapChatLuong(maCap),

    CONSTRAINT CK_CTL_LoaiTrangBi
        CHECK (
            (maLoaiSPKT IS NOT NULL AND maLoaiTBDB IS NULL)
            OR
            (maLoaiSPKT IS NULL AND maLoaiTBDB IS NOT NULL)
        ),

    CONSTRAINT CK_CTL_SoLuong
        CHECK (soLuong > 0),

    CONSTRAINT CK_CTL_SLThuc
        CHECK (slThuc IS NULL OR slThuc >= 0)
);
   


CREATE TABLE SPKTTrongLenh (
    maCTLenh             INT    NOT NULL,
    soHieu               VARCHAR(30)     NOT NULL,
    maLoaiSPKT           VARCHAR(30)     NOT NULL,
    namSX                INT             NULL,
    maNuocSX             VARCHAR(20)     NULL,
    maCCL                INT             NULL,
    hinhThucNiemCat      VARCHAR(20)     NULL,
    maTinhTrangBaoGoi    VARCHAR(20)     NULL,
    maKho                VARCHAR(30)     NULL,
    maNhaKho             VARCHAR(30)     NULL,
    maKhu                VARCHAR(30)     NULL,
    maKhoi               VARCHAR(30)     NULL,
    maTang               VARCHAR(30)     NULL,
    maHom                VARCHAR(30)     NULL,
    maTrangThaiTB        VARCHAR(20)     NULL,
    viTri                NVARCHAR(500)   NULL,
    soLuong              INT             NOT NULL,
    donGia               DECIMAL(18,2)   NULL,
    thanhTien            AS (ISNULL(soLuong,0) * ISNULL(donGia,0)) PERSISTED,
    ghiChu               NVARCHAR(1000)  NULL,
    CONSTRAINT PK_SPKTTrongLenh PRIMARY KEY (maCTLenh, soHieu),
    CONSTRAINT FK_SPKTTL_CTL FOREIGN KEY (maCTLenh) REFERENCES ChiTietLenh(maCTLenh),
    CONSTRAINT FK_SPKTTL_Loai FOREIGN KEY (maLoaiSPKT) REFERENCES LoaiSPKT(maLoai),
    CONSTRAINT FK_SPKTTL_NSX FOREIGN KEY (maNuocSX) REFERENCES NSX(maNSX),
    CONSTRAINT FK_SPKTTL_CCL FOREIGN KEY (maCCL) REFERENCES CapChatLuong(maCap),
    CONSTRAINT FK_SPKTTL_HTNC FOREIGN KEY (hinhThucNiemCat) REFERENCES HinhThucNiemCat(maHTNC),
    CONSTRAINT FK_SPKTTL_TTBG FOREIGN KEY (maTinhTrangBaoGoi) REFERENCES TinhTrangBaoGoi(maTTBG),
    CONSTRAINT FK_SPKTTL_Hom FOREIGN KEY (maHom) REFERENCES Hom(maHom),
    CONSTRAINT FK_SPKTTL_TrangThai FOREIGN KEY (maTrangThaiTB) REFERENCES TrangThaiTB(maTTTB)
);

CREATE TABLE CTDongBoTrongLenh (
    maCTLenh            INT     NOT NULL,
    maTBDB               VARCHAR(30)     NOT NULL,
    maLoaiTB             VARCHAR(30)     NOT NULL,
    namSX                INT             NULL,
    maNuocSX             VARCHAR(20)     NULL,
    maCCL                INT             NULL,
    hinhThucNiemCat      VARCHAR(20)     NULL,
    maTinhTrangBaoGoi    VARCHAR(20)     NULL,
    maKho                VARCHAR(30)     NULL,
    maNhaKho             VARCHAR(30)     NULL,
    maKhu                VARCHAR(30)     NULL,
    maKhoi               VARCHAR(30)     NULL,
    maTang               VARCHAR(30)     NULL,
    maHom                VARCHAR(30)     NULL,
    maTrangThaiTB        VARCHAR(20)     NULL,
    viTri                NVARCHAR(500)   NULL,
    soLuong              INT             NOT NULL,
    soLuongThuc          INT             NULL,
    donGia               DECIMAL(18,2)   NULL,
    thanhTien            AS (ISNULL(soLuong,0) * ISNULL(donGia,0)) PERSISTED,
    ghiChu               NVARCHAR(1000)  NULL,
    CONSTRAINT PK_CTDongBoTrongLenh PRIMARY KEY (maCTLenh, maTBDB),
    CONSTRAINT FK_CTDBTL_CTL FOREIGN KEY (maCTLenh) REFERENCES ChiTietLenh(maCTLenh),
    CONSTRAINT FK_CTDBTL_TBDB FOREIGN KEY (maTBDB) REFERENCES TBDB(maTBDB),
    CONSTRAINT FK_CTDBTL_NSX FOREIGN KEY (maNuocSX) REFERENCES NSX(maNSX),
    CONSTRAINT FK_CTDBTL_CCL FOREIGN KEY (maCCL) REFERENCES CapChatLuong(maCap),
    CONSTRAINT FK_CTDBTL_HTNC FOREIGN KEY (hinhThucNiemCat) REFERENCES HinhThucNiemCat(maHTNC),
    CONSTRAINT FK_CTDBTL_TTBG FOREIGN KEY (maTinhTrangBaoGoi) REFERENCES TinhTrangBaoGoi(maTTBG),
    CONSTRAINT FK_CTDBTL_Hom FOREIGN KEY (maHom) REFERENCES Hom(maHom),
    CONSTRAINT FK_CTDBTL_TrangThai FOREIGN KEY (maTrangThaiTB) REFERENCES TrangThaiTB(maTTTB),
    CONSTRAINT CK_CTDBTL_LoaiTB CHECK (maLoaiTB IN ('SPKT','TBDB'))
);

/* =========================================================
   V. KIỂM KÊ VÀ CHUYỂN KỲ
   ========================================================= */

CREATE TABLE DotKiemKe (
    maDotKiemKe    VARCHAR(30)     NOT NULL PRIMARY KEY,
    tenDotKiemKe   NVARCHAR(200)   NOT NULL,
    ngayBatDau     DATE            NOT NULL,
    ngayKetThuc    DATE            NULL,
    trangThai      VARCHAR(30)     NULL,
    noiDung        NVARCHAR(1000)  NULL,
    ghiChu         NVARCHAR(500)   NULL
);

CREATE TABLE PhieuKiemKe (
    maPhieuKiemKe  VARCHAR(30)    NOT NULL PRIMARY KEY,
    maDotKiemKe    VARCHAR(30)    NOT NULL,
    ngayLap        DATE           NOT NULL,
    ngayKiemKe     DATE           NULL,
    maKho        VARCHAR(30)    NOT NULL,
    nhomTB         NVARCHAR(50)   NOT NULL,
    noiDung        NVARCHAR(500)  NULL,
    trangThai      NVARCHAR(50)   NULL,
    nguoiTao       NVARCHAR(100)  NULL,
    nguoiKiemKe    NVARCHAR(100)  NULL,
    ngayKetThuc    DATE           NULL,
    CONSTRAINT FK_PhieuKK_DotKK FOREIGN KEY (maDotKiemKe) REFERENCES DotKiemKe(maDotKiemKe),
    CONSTRAINT FK_PhieuKK_DonVi FOREIGN KEY (maKho) REFERENCES Kho(maKho)
);

CREATE TABLE ChiTietKiemKe (
    maCTKiemKe       INT IDENTITY(1,1) PRIMARY KEY ,
    maPhieuKiemKe   VARCHAR(30)    NOT NULL,
    maLoaiSPKT      VARCHAR(30)    NULL,
    maTBDB          VARCHAR(30)    NULL,
    soLuongKyTruoc  INT            NOT NULL DEFAULT 0,
    soTang          INT            NOT NULL DEFAULT 0,
    soGiam          INT            NOT NULL DEFAULT 0,
    soLuongSoSach   INT            NOT NULL DEFAULT 0,
    soLuongThucTe   INT            NOT NULL DEFAULT 0,
    thua             AS (CASE WHEN soLuongThucTe > soLuongSoSach THEN soLuongThucTe - soLuongSoSach ELSE 0 END) PERSISTED,
    thieu            AS (CASE WHEN soLuongSoSach > soLuongThucTe THEN soLuongSoSach - soLuongThucTe ELSE 0 END) PERSISTED,
    ghiChu          NVARCHAR(500)  NULL,
    CONSTRAINT FK_CTKT_Phieu FOREIGN KEY (maPhieuKiemKe) REFERENCES PhieuKiemKe(maPhieuKiemKe),
    CONSTRAINT FK_CTKT_LoaiSPKT FOREIGN KEY (maLoaiSPKT) REFERENCES LoaiSPKT(maLoai),
    CONSTRAINT FK_CTKT_TBDB FOREIGN KEY (maTBDB) REFERENCES TBDB(maTBDB),
    CONSTRAINT CK_CTKT_DoiTuong CHECK (
        (maLoaiSPKT IS NOT NULL AND maTBDB IS NULL)
        OR (maLoaiSPKT IS NULL AND maTBDB IS NOT NULL)
    )
);

CREATE TABLE ChuyenKy (
    maChuyenKy      VARCHAR(30)    NOT NULL PRIMARY KEY,
    maPhieuKiemKe   VARCHAR(30)    NOT NULL,
    namCu            INT            NOT NULL,
    namMoi           INT            NOT NULL,
    ngayChuyen       DATE           NOT NULL,
    trangThai        NVARCHAR(30)   NULL,
    nguoiThucHien    NVARCHAR(100)  NULL,
    ghiChu           NVARCHAR(500)  NULL,
    CONSTRAINT FK_ChuyenKy_PhieuKK FOREIGN KEY (maPhieuKiemKe) REFERENCES PhieuKiemKe(maPhieuKiemKe),
    CONSTRAINT CK_ChuyenKy_Nam CHECK (namMoi = namCu + 1)
);

/* =========================================================
   VI. NGƯỜI DÙNG, VAI TRÒ, PHÂN QUYỀN
   ========================================================= */

CREATE TABLE NguoiDung (
    maND              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    tenDangNhap       VARCHAR(50)       NOT NULL UNIQUE,
    matKhauHash       VARCHAR(255)      NOT NULL,
    hoTen              NVARCHAR(200)     NOT NULL,
    maCapBac           VARCHAR(20)       NULL,
    maChucVu           VARCHAR(50)       NULL,
    maDonVi            VARCHAR(30)       NULL,
    email              VARCHAR(200)      NULL UNIQUE,
    soDienThoai        VARCHAR(20)       NULL,
    avatarURL          VARCHAR(500)      NULL,
    isActive           BIT               NOT NULL DEFAULT 1,
    biKhoa             BIT               NOT NULL DEFAULT 0,
    lyDoKhoa           NVARCHAR(500)     NULL,
    lanDangNhapCuoi    DATETIME2         NULL,
    soLanSaiMK         INT               NOT NULL DEFAULT 0,
    createdAt          DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
    createdBy          INT               NULL,
    updatedAt          DATETIME2         NULL,
    updatedBy          INT               NULL,
    CONSTRAINT FK_ND_CapBac FOREIGN KEY (maCapBac) REFERENCES CapBac(maCapBac),
    CONSTRAINT FK_ND_ChucVu FOREIGN KEY (maChucVu) REFERENCES ChucVu(maChucVu),
    CONSTRAINT FK_ND_DonVi FOREIGN KEY (maDonVi) REFERENCES Kho(maKho),
    CONSTRAINT FK_ND_CreatedBy FOREIGN KEY (createdBy) REFERENCES NguoiDung(maND),
    CONSTRAINT FK_ND_UpdatedBy FOREIGN KEY (updatedBy) REFERENCES NguoiDung(maND)
);

CREATE TABLE VaiTro (
    maVaiTro    VARCHAR(50)    NOT NULL PRIMARY KEY,
    tenVaiTro   NVARCHAR(200)  NOT NULL,
    moTa        NVARCHAR(500)  NULL
);

CREATE TABLE NguoiDungVaiTro (
    maNguoiDung INT            NOT NULL,
    maVaiTro    VARCHAR(50)    NOT NULL,
    ghiChu      NVARCHAR(500)  NULL,
    CONSTRAINT PK_NguoiDungVaiTro PRIMARY KEY (maNguoiDung, maVaiTro),
    CONSTRAINT FK_NDVT_ND FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maND),
    CONSTRAINT FK_NDVT_VT FOREIGN KEY (maVaiTro) REFERENCES VaiTro(maVaiTro)
);

CREATE TABLE ChucNang (
    maCN        VARCHAR(50)    NOT NULL PRIMARY KEY,
    tenCN       NVARCHAR(200)  NOT NULL,
    ghiChu      NVARCHAR(100)  NULL
);

CREATE TABLE Quyen (
    maQuyen     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    tenQuyen    VARCHAR(30)       NOT NULL UNIQUE,
    ghiChu      NVARCHAR(100)     NULL
);

CREATE TABLE VaiTroChucNangQuyen (
    maVaiTro    VARCHAR(50) NOT NULL,
    maQuyen     INT         NOT NULL,
    maCN        VARCHAR(50) NOT NULL,
    CONSTRAINT PK_VTCNQ PRIMARY KEY (maVaiTro, maQuyen, maCN),
    CONSTRAINT FK_VTCNQ_VT FOREIGN KEY (maVaiTro) REFERENCES VaiTro(maVaiTro),
    CONSTRAINT FK_VTCNQ_Q FOREIGN KEY (maQuyen) REFERENCES Quyen(maQuyen),
    CONSTRAINT FK_VTCNQ_CN FOREIGN KEY (maCN) REFERENCES ChucNang(maCN)
);

CREATE TABLE NhatKyHoatDong (
    id              BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    maNguoiDung     INT                  NULL,
    tenDangNhap     VARCHAR(50)          NULL,
    hanhDong        VARCHAR(50)          NOT NULL,
    doiTuong        VARCHAR(100)         NULL,
    maDoiTuong      VARCHAR(50)          NULL,
    moTa            NVARCHAR(1000)       NULL,
    duLieuTruoc     NVARCHAR(MAX)        NULL,
    duLieuSau       NVARCHAR(MAX)        NULL,
    thoiGian        DATETIME2            NOT NULL DEFAULT SYSDATETIME(),
    ketQua          VARCHAR(20)          NOT NULL,
    lyDoThatBai     NVARCHAR(500)        NULL,
    CONSTRAINT FK_NKHD_ND FOREIGN KEY (maNguoiDung) REFERENCES NguoiDung(maND),
    CONSTRAINT CK_NKHD_HanhDong CHECK (hanhDong IN
        ('DANG_NHAP','DANG_XUAT','XEM','THEM','SUA','XOA','PHE_DUYET')),
    CONSTRAINT CK_NKHD_KetQua CHECK (ketQua IN ('THANH_CONG','THAT_BAI'))
);
GO

/* =========================================================
   DỮ LIỆU MẪU: 10 BẢN GHI CHO MỖI BẢNG
   ========================================================= */
INSERT INTO NhomSPKT (maNhom, tenNhom, moTa) VALUES
    (N'NH01', N'Súng bộ binh', N'Nhóm súng trang bị cá nhân'),
    (N'NH02', N'Pháo mặt đất', N'Nhóm pháo sử dụng trên mặt đất'),
    (N'NH03', N'Pháo phòng không', N'Nhóm pháo phòng không'),
    (N'NH04', N'Tên lửa', N'Nhóm tên lửa'),
    (N'NH05', N'Súng cối', N''),
    (N'NH06', N'Đạn dược', N'Các loại đạn'),
    (N'NH07', N'Vũ khí chống tăng', N'Trang bị chống tăng'),
    (N'NH08', N'Trang bị công binh', N'Trang bị phục vụ công binh'),
    (N'NH09', N'Trang bị thông tin', N'Trang bị thông tin liên lạc'),
    (N'NH10', N'Trang bị hóa học', N'Trang bị phòng hóa');
GO
INSERT INTO DVT (maDVT, tenDVT, donViCoBan, heSoCoBan, ghiChu) VALUES
    (N'DVT01', N'Khẩu', N'KHAU', 1.0, NULL),
    (N'DVT02', N'Bộ', N'BO', 1.0, NULL),
    (N'DVT03', N'Chiếc', N'CHIEC', 1.0, NULL),
    (N'DVT04', N'Hòm', N'HOM', 1.0, NULL),
    (N'DVT05', N'Viên', N'VIEN', 1.0, NULL),
    (N'DVT06', N'Quả', N'QUA', 1.0, NULL),
    (N'DVT07', N'Kg', N'KG', 1.0, NULL),
    (N'DVT08', N'Tấn', N'KG', 1000.0, NULL),
    (N'DVT09', N'Mét', N'M', 1.0, NULL),
    (N'DVT10', N'Cuộn', N'CUON', 1.0, NULL);
GO
INSERT INTO LoaiSPKT (maLoai, maNhom, tenLoai, co, kiHieu, nuocSX, maDVT, ghiChu) VALUES
    (N'LSP01', N'NH01', N'Súng tiểu liên', N'7,62 mm', N'AK', N'Việt Nam', N'DVT01', NULL),
    (N'LSP02', N'NH01', N'Súng trung liên', N'7,62 mm', N'RPD', N'Liên Xô', N'DVT01', NULL),
    (N'LSP03', N'NH02', N'Pháo lựu', N'122 mm', N'D-30', N'Liên Xô', N'DVT01', NULL),
    (N'LSP04', N'NH03', N'Pháo phòng không', N'37 mm', N'M1939', N'Liên Xô', N'DVT01', NULL),
    (N'LSP05', N'NH04', N'Tên lửa phòng không', NULL, N'A72', N'Liên Xô', N'DVT02', NULL),
    (N'LSP06', N'NH05', N'Kính ngắm', NULL, N'K10', N'Việt Nam', N'DVT03', NULL),
    (N'LSP07', N'NH06', N'Đạn súng bộ binh', N'7,62 mm', N'K56', N'Việt Nam', N'DVT05', NULL),
    (N'LSP08', N'NH07', N'Súng chống tăng', N'40 mm', N'B41', N'Liên Xô', N'DVT01', NULL),
    (N'LSP09', N'NH08', N'Máy dò mìn', NULL, N'MDM-1', N'Việt Nam', N'DVT03', NULL),
    (N'LSP10', N'NH09', N'Máy vô tuyến', NULL, N'VRU-812', N'Việt Nam', N'DVT02', NULL);
GO
INSERT INTO KieuSPKT (maKieu, tenKieu, nuocSX, maDVT, ghiChu) VALUES
    (N'K01', N'AKM', N'Liên Xô', N'DVT01', NULL),
    (N'K02', N'AK-47', N'Liên Xô', N'DVT01', NULL),
    (N'K03', N'RPD', N'Liên Xô', N'DVT01', NULL),
    (N'K04', N'D-30', N'Liên Xô', N'DVT01', NULL),
    (N'K05', N'M1939', N'Liên Xô', N'DVT01', NULL),
    (N'K06', N'A72', N'Liên Xô', N'DVT02', NULL),
    (N'K07', N'K10', N'Việt Nam', N'DVT03', NULL),
    (N'K08', N'B41', N'Liên Xô', N'DVT01', NULL),
    (N'K09', N'MDM-1', N'Việt Nam', N'DVT03', NULL),
    (N'K10', N'VRU-812', N'Việt Nam', N'DVT02', NULL);
GO
INSERT INTO LoaiTBThuocKieu (maKieu, maLoaiSPKT) VALUES
    (N'K01', N'LSP01'),
    (N'K02', N'LSP01'),
    (N'K03', N'LSP02'),
    (N'K04', N'LSP03'),
    (N'K05', N'LSP04'),
    (N'K06', N'LSP05'),
    (N'K07', N'LSP06'),
    (N'K08', N'LSP08'),
    (N'K09', N'LSP09'),
    (N'K10', N'LSP10');
GO
INSERT INTO LoaiTBDB (maLoai, tenLoai) VALUES
    (N'LTB01', N'Bộ A'),
    (N'LTB02', N'Bộ B'),
    (N'LTB03', N'Bộ C'),
    (N'LTB04', N'Bộ E'),
    (N'LTB05', N'Trang cụ'),
    (N'LTB06', N'Thông nòng'),
    (N'LTB07', N'Kính ngắm'),
    (N'LTB08', N'Lốp'),
    (N'LTB09', N'Chiếu sáng'),
    (N'LTB10', N'Quân cụ');
GO
INSERT INTO CapChatLuong (maCap, tenCap, moTa) VALUES
    (1, N'Cấp 1', N'Mới hoặc chất lượng tốt'),
    (2, N'Cấp 2', N'Đã qua sử dụng, chất lượng tốt'),
    (3, N'Cấp 3', N'Chất lượng trung bình'),
    (4, N'Cấp 4', N'Cần bảo dưỡng'),
    (5, N'Cấp 5', N'Cần sửa chữa')
   
GO
INSERT INTO NSX (maNSX, tenNSX, ghiChu) VALUES
    (N'NSX01', N'Việt Nam', NULL),
    (N'NSX02', N'Liên Xô', NULL),
    (N'NSX03', N'Nga', NULL),
    (N'NSX04', N'Trung Quốc', NULL),
    (N'NSX05', N'Đức', NULL),
    (N'NSX06', N'Séc', NULL),
    (N'NSX07', N'Ba Lan', NULL),
    (N'NSX08', N'Hoa Kỳ', NULL),
    (N'NSX09', N'Pháp', NULL),
    (N'NSX10', N'Israel', NULL);
GO
INSERT INTO HangSX (maHSX, tenHSX, diaChi, email, SDT, ghiChu, maNSX) VALUES
    (N'HSX01', N'Hãng sản xuất 1', N'Địa chỉ hãng 1', N'hang1@example.com', N'0900000001', NULL, N'NSX01'),
    (N'HSX02', N'Hãng sản xuất 2', N'Địa chỉ hãng 2', N'hang2@example.com', N'0900000002', NULL, N'NSX02'),
    (N'HSX03', N'Hãng sản xuất 3', N'Địa chỉ hãng 3', N'hang3@example.com', N'0900000003', NULL, N'NSX03'),
    (N'HSX04', N'Hãng sản xuất 4', N'Địa chỉ hãng 4', N'hang4@example.com', N'0900000004', NULL, N'NSX04'),
    (N'HSX05', N'Hãng sản xuất 5', N'Địa chỉ hãng 5', N'hang5@example.com', N'0900000005', NULL, N'NSX05'),
    (N'HSX06', N'Hãng sản xuất 6', N'Địa chỉ hãng 6', N'hang6@example.com', N'0900000006', NULL, N'NSX06'),
    (N'HSX07', N'Hãng sản xuất 7', N'Địa chỉ hãng 7', N'hang7@example.com', N'0900000007', NULL, N'NSX07'),
    (N'HSX08', N'Hãng sản xuất 8', N'Địa chỉ hãng 8', N'hang8@example.com', N'0900000008', NULL, N'NSX08'),
    (N'HSX09', N'Hãng sản xuất 9', N'Địa chỉ hãng 9', N'hang9@example.com', N'0900000009', NULL, N'NSX09'),
    (N'HSX10', N'Hãng sản xuất 10', N'Địa chỉ hãng 10', N'hang10@example.com', N'0900000010', NULL, N'NSX10');
GO
INSERT INTO NCC (maNCC, tenNCC, diaChi, email, SDT, ghiChu, maNSX) VALUES
    (N'NCC01', N'Nhà cung cấp 1', N'Địa chỉ NCC 1', N'ncc1@example.com', N'0910000001', NULL, N'NSX01'),
    (N'NCC02', N'Nhà cung cấp 2', N'Địa chỉ NCC 2', N'ncc2@example.com', N'0910000002', NULL, N'NSX02'),
    (N'NCC03', N'Nhà cung cấp 3', N'Địa chỉ NCC 3', N'ncc3@example.com', N'0910000003', NULL, N'NSX03'),
    (N'NCC04', N'Nhà cung cấp 4', N'Địa chỉ NCC 4', N'ncc4@example.com', N'0910000004', NULL, N'NSX04'),
    (N'NCC05', N'Nhà cung cấp 5', N'Địa chỉ NCC 5', N'ncc5@example.com', N'0910000005', NULL, N'NSX05'),
    (N'NCC06', N'Nhà cung cấp 6', N'Địa chỉ NCC 6', N'ncc6@example.com', N'0910000006', NULL, N'NSX06'),
    (N'NCC07', N'Nhà cung cấp 7', N'Địa chỉ NCC 7', N'ncc7@example.com', N'0910000007', NULL, N'NSX07'),
    (N'NCC08', N'Nhà cung cấp 8', N'Địa chỉ NCC 8', N'ncc8@example.com', N'0910000008', NULL, N'NSX08'),
    (N'NCC09', N'Nhà cung cấp 9', N'Địa chỉ NCC 9', N'ncc9@example.com', N'0910000009', NULL, N'NSX09'),
    (N'NCC10', N'Nhà cung cấp 10', N'Địa chỉ NCC 10', N'ncc10@example.com', N'0910000010', NULL, N'NSX10');
GO
INSERT INTO HTTT (maHTTT, tenHTTT, mucPhi, ghiChu) VALUES
    (N'HT01', N'Cấp hiện vật không thu tiền', 0, NULL),
    (N'HT02', N'Theo dõi ghi nợ', 0, NULL),
    (N'HT03', N'Thanh toán chuyển khoản', 50000, NULL),
    (N'HT04', N'Thanh toán tiền mặt', 30000, NULL),
    (N'HT05', N'Cấp theo kế hoạch', 0, NULL),
    (N'HT06', N'Cấp khẩn cấp', 100000, NULL),
    (N'HT07', N'Điều chuyển nội bộ', 0, NULL),
    (N'HT08', N'Viện trợ', 0, NULL),
    (N'HT09', N'Mua sắm tập trung', 200000, NULL),
    (N'HT10', N'Khác', 0, NULL);
GO
INSERT INTO HTVanChuyen (maHTVC, tenHTVC, mucPhi, ghiChu) VALUES
    (N'VC01', N'Đường bộ', 1000000, NULL),
    (N'VC02', N'Đường sắt', 1500000, NULL),
    (N'VC03', N'Đường thủy', 1200000, NULL),
    (N'VC04', N'Đường không', 5000000, NULL),
    (N'VC05', N'Xe chuyên dụng', 2000000, NULL),
    (N'VC06', N'Xe tải', 1800000, NULL),
    (N'VC07', N'Container', 2500000, NULL),
    (N'VC08', N'Tàu quân sự', 3000000, NULL),
    (N'VC09', N'Máy bay quân sự', 6000000, NULL),
    (N'VC10', N'Tự vận chuyển', 0, NULL);
GO

INSERT INTO TinhChatNhapXuat (maNX, tenNX, nhomTB, ghiChu) VALUES
    (N'NX01', N'Nhập', N'SPKT', NULL),
    (N'NX02', N'Xuất', N'SPKT', NULL),
    (N'NX03', N'Nhập ', N'TBDB', NULL),
    (N'NX04', N'Xuất', N'TBDB', NULL)
    ;
GO



INSERT INTO ChiTietTCNX (maCTNX, tenCTNX, maNX, ghiChu) VALUES
    (N'CTNX01', N'Nhập mới', N'NX01', NULL),
    (N'CTNX02', N'Nhập điều chuyển', N'NX01', NULL),
    (N'CTNX03', N'Nhập thu hồi', N'NX03', NULL),
    (N'CTNX04', N'Nhập viện trợ', N'NX01', NULL),
    (N'CTNX05', N'Nhập viện trợ', N'NX03', NULL),
    (N'CTNX06', N'Xuất thanh lý', N'NX04', NULL)
    ;
GO
INSERT INTO HinhThucNiemCat (maHTNC, tenHTNC) VALUES
    (N'NC01', N'Chưa niêm cất'),
    (N'NC02', N'Niêm cất ngắn hạn'),
    (N'NC03', N'Niêm cất dài hạn'),
    (N'NC04', N'Sẵn sàng chiến đấu'),
    (N'NC05', N'Bảo quản thường xuyên'),
    (N'NC06', N'Bảo quản đặc biệt'),
    (N'NC07', N'Chờ niêm cất'),
    (N'NC08', N'Đang mở niêm'),
    (N'NC09', N'Đã mở niêm');
GO
INSERT INTO TinhTrangBaoGoi (maTTBG, tenTTBG, ghiChu) VALUES
    (N'BG01', N'Có hòm', NULL),
    (N'BG02', N'Không hòm', NULL),
    (N'BG03', N'Kê kích', NULL),
    (N'BG04', N'Trên giá', NULL),
    (N'BG05', N'Đóng kiện', NULL),
    (N'BG06', N'Bọc chống ẩm', NULL),
    (N'BG07', N'Niêm phong', NULL),
    (N'BG08', N'Bao gói nguyên bản', NULL),
    (N'BG09', N'Bao gói thay thế', NULL),
    (N'BG10', N'Khác', NULL);
GO
INSERT INTO TrangThaiTB (maTTTB, tenTTTB, ghiChu) VALUES
    (N'TT01', N'Đang sử dụng', NULL),
    (N'TT02', N'Đang sửa chữa', NULL),
    (N'TT03', N'Đang làm lệnh', NULL),
    (N'TT04', N'Đang chuyển cấp', NULL),
    (N'TT05', N'Đang chuyển nước', NULL),
    (N'TT06', N'Đang niêm cất', NULL),
    (N'TT07', N'Chờ kiểm định', NULL),
    (N'TT08', N'Chờ thanh lý', NULL),
    (N'TT09', N'Tạm dừng sử dụng', NULL),
    (N'TT10', N'Bình thường', NULL);
GO
INSERT INTO CapBac (maCapBac, tenCapBac, thuTu) VALUES
    (N'CB01', N'Binh nhì', 1),
    (N'CB02', N'Binh nhất', 2),
    (N'CB03', N'Hạ sĩ', 3),
    (N'CB04', N'Trung sĩ', 4),
    (N'CB05', N'Thượng sĩ', 5),
    (N'CB06', N'Thiếu úy', 6),
    (N'CB07', N'Trung úy', 7),
    (N'CB08', N'Thượng úy', 8),
    (N'CB09', N'Đại úy', 9),
    (N'CB10', N'Thiếu tá', 10);
GO
INSERT INTO ChucVu (maChucVu, tenChucVu, moTa) VALUES
    (N'CV01', N'Cục trưởng', N'Mô tả chức vụ Cục trưởng'),
    (N'CV02', N'Cục phó', N'Mô tả chức vụ Cục phó'),
    (N'CV03', N'Trưởng phòng', N'Mô tả chức vụ Trưởng phòng'),
    (N'CV04', N'Phó trưởng phòng', N'Mô tả chức vụ Phó trưởng phòng'),
    (N'CV05', N'Chỉ huy trưởng kho', N'Mô tả chức vụ Chỉ huy trưởng kho'),
    (N'CV06', N'Phó chỉ huy trưởng kho', N'Mô tả chức vụ Phó chỉ huy trưởng kho'),
    (N'CV07', N'Thủ kho', N'Mô tả chức vụ Thủ kho'),
    (N'CV08', N'Kiểm kho viên', N'Mô tả chức vụ Kiểm kho viên'),
    (N'CV09', N'Nhân viên kỹ thuật', N'Mô tả chức vụ Nhân viên kỹ thuật'),
    (N'CV10', N'Nhân viên nghiệp vụ', N'Mô tả chức vụ Nhân viên nghiệp vụ');
GO
INSERT INTO Tinh (maTinh, tenTinh, vungMien, ghiChu) VALUES
    (N'01', N'Thành phố Hà Nội', N'BAC', NULL),
    (N'02', N'Tỉnh Hà Giang', N'BAC', NULL),
    (N'04', N'Tỉnh Cao Bằng', N'BAC', NULL),
    (N'06', N'Tỉnh Bắc Kạn', N'BAC', NULL),
    (N'08', N'Tỉnh Tuyên Quang', N'BAC', NULL),
    (N'10', N'Tỉnh Lào Cai', N'BAC', NULL),
    (N'11', N'Tỉnh Điện Biên', N'BAC', NULL),
    (N'15', N'Tỉnh Yên Bái', N'BAC', NULL),
    (N'48', N'Thành phố Đà Nẵng', N'TRUNG', NULL),
    (N'79', N'Thành phố Hồ Chí Minh', N'NAM', NULL);
GO
INSERT INTO Xa (maXa, maTinh, tenXa, ghiChu) VALUES
    (N'XA0001', N'01', N'Xã mẫu 1', NULL),
    (N'XA0002', N'02', N'Xã mẫu 2', NULL),
    (N'XA0003', N'04', N'Xã mẫu 3', NULL),
    (N'XA0004', N'06', N'Xã mẫu 4', NULL),
    (N'XA0005', N'08', N'Xã mẫu 5', NULL),
    (N'XA0006', N'10', N'Xã mẫu 6', NULL),
    (N'XA0007', N'11', N'Xã mẫu 7', NULL),
    (N'XA0008', N'15', N'Xã mẫu 8', NULL),
    (N'XA0009', N'48', N'Xã mẫu 9', NULL),
    (N'XA0010', N'79', N'Xã mẫu 10', NULL);
GO

INSERT INTO LoaiKho (maLoaiKho, tenLoaiKho) VALUES
    (N'KHO', N'Kho Cục quân khí'),
    (N'KNV', N'Kho nghiệp vụ');
    
GO
INSERT INTO Kho (maKho, maLoaiKho, tenKho, dienTich, diaChi, maXa, maTinh, ghiChu) VALUES
    (N'K01', N'KHO', N'Kho 1', 1100, N'Địa chỉ kho 1', N'XA0001', N'01', NULL),
    (N'K02', N'KNV', N'Kho 2', 1200, N'Địa chỉ kho 2', N'XA0002', N'02', NULL),
    (N'K03', N'KHO', N'Kho 3', 1300, N'Địa chỉ kho 3', N'XA0003', N'04', NULL),
    (N'K04', N'KHO', N'Kho 4', 1400, N'Địa chỉ kho 4', N'XA0004', N'06', NULL),
    (N'K05', N'KHO', N'Kho 5', 1500, N'Địa chỉ kho 5', N'XA0005', N'08', NULL),
    (N'K06', N'KHO', N'Kho 6', 1600, N'Địa chỉ kho 6', N'XA0006', N'10', NULL),
    (N'K07', N'KHO', N'Kho 7', 1700, N'Địa chỉ kho 7', N'XA0007', N'11', NULL),
    (N'K08', N'KHO', N'Kho 8', 1800, N'Địa chỉ kho 8', N'XA0008', N'15', NULL),
    (N'K09', N'KHO', N'Kho 9', 1900, N'Địa chỉ kho 9', N'XA0009', N'48', NULL),
    (N'K10', N'KHO', N'Kho 10', 2000, N'Địa chỉ kho 10', N'XA0010', N'79', NULL);
GO
INSERT INTO NhaKho (maNhaKho, maKho, tenNhaKho, ghiChu) VALUES
    (N'NK01', N'K01', N'Nhà kho 1', NULL),
    (N'NK02', N'K02', N'Nhà kho 2', NULL),
    (N'NK03', N'K03', N'Nhà kho 3', NULL),
    (N'NK04', N'K04', N'Nhà kho 4', NULL),
    (N'NK05', N'K05', N'Nhà kho 5', NULL),
    (N'NK06', N'K06', N'Nhà kho 6', NULL),
    (N'NK07', N'K07', N'Nhà kho 7', NULL),
    (N'NK08', N'K08', N'Nhà kho 8', NULL),
    (N'NK09', N'K09', N'Nhà kho 9', NULL),
    (N'NK10', N'K10', N'Nhà kho 10', NULL);
GO
INSERT INTO DinhKhu (maDinhKhu, maNhaKho, tenDinhKhu, ghiChu) VALUES
    (N'DK01', N'NK01', N'Định khu 1', NULL),
    (N'DK02', N'NK02', N'Định khu 2', NULL),
    (N'DK03', N'NK03', N'Định khu 3', NULL),
    (N'DK04', N'NK04', N'Định khu 4', NULL),
    (N'DK05', N'NK05', N'Định khu 5', NULL),
    (N'DK06', N'NK06', N'Định khu 6', NULL),
    (N'DK07', N'NK07', N'Định khu 7', NULL),
    (N'DK08', N'NK08', N'Định khu 8', NULL),
    (N'DK09', N'NK09', N'Định khu 9', NULL),
    (N'DK10', N'NK10', N'Định khu 10', NULL);
GO
INSERT INTO KhoiHang (maKhoi, maDinhKhu, tenKhoi, ghiChu) VALUES
    (N'KH01', N'DK01', N'Khối hàng 1', NULL),
    (N'KH02', N'DK02', N'Khối hàng 2', NULL),
    (N'KH03', N'DK03', N'Khối hàng 3', NULL),
    (N'KH04', N'DK04', N'Khối hàng 4', NULL),
    (N'KH05', N'DK05', N'Khối hàng 5', NULL),
    (N'KH06', N'DK06', N'Khối hàng 6', NULL),
    (N'KH07', N'DK07', N'Khối hàng 7', NULL),
    (N'KH08', N'DK08', N'Khối hàng 8', NULL),
    (N'KH09', N'DK09', N'Khối hàng 9', NULL),
    (N'KH10', N'DK10', N'Khối hàng 10', NULL);
GO
INSERT INTO GiaHang (maGia, maKhoi, tenGia, ghiChu) VALUES
    (N'G01', N'KH01', N'Giá hàng 1', NULL),
    (N'G02', N'KH02', N'Giá hàng 2', NULL),
    (N'G03', N'KH03', N'Giá hàng 3', NULL),
    (N'G04', N'KH04', N'Giá hàng 4', NULL),
    (N'G05', N'KH05', N'Giá hàng 5', NULL),
    (N'G06', N'KH06', N'Giá hàng 6', NULL),
    (N'G07', N'KH07', N'Giá hàng 7', NULL),
    (N'G08', N'KH08', N'Giá hàng 8', NULL),
    (N'G09', N'KH09', N'Giá hàng 9', NULL),
    (N'G10', N'KH10', N'Giá hàng 10', NULL);
GO
INSERT INTO Tang (maTang, maGia, soTang, ghiChu) VALUES
    (N'T01', N'G01', 1, NULL),
    (N'T02', N'G02', 1, NULL),
    (N'T03', N'G03', 1, NULL),
    (N'T04', N'G04', 1, NULL),
    (N'T05', N'G05', 1, NULL),
    (N'T06', N'G06', 1, NULL),
    (N'T07', N'G07', 1, NULL),
    (N'T08', N'G08', 1, NULL),
    (N'T09', N'G09', 1, NULL),
    (N'T10', N'G10', 1, NULL);
GO
INSERT INTO Hom (maHom, maTang, ghiChu) VALUES
    (N'H01', N'T01', N'Hòm số 1'),
    (N'H02', N'T02', N'Hòm số 2'),
    (N'H03', N'T03', N'Hòm số 3'),
    (N'H04', N'T04', N'Hòm số 4'),
    (N'H05', N'T05', N'Hòm số 5'),
    (N'H06', N'T06', N'Hòm số 6'),
    (N'H07', N'T07', N'Hòm số 7'),
    (N'H08', N'T08', N'Hòm số 8'),
    (N'H09', N'T09', N'Hòm số 9'),
    (N'H10', N'T10', N'Hòm số 10');
GO
INSERT INTO NhomDongBo (maKieuSPKT, maLoaiTBDB, ghiChu) VALUES
    (N'K01', N'LTB01', N'Nhóm đồng bộ 1'),
    (N'K02', N'LTB02', N'Nhóm đồng bộ 2'),
    (N'K03', N'LTB03', N'Nhóm đồng bộ 3'),
    (N'K04', N'LTB04', N'Nhóm đồng bộ 4'),
    (N'K05', N'LTB05', N'Nhóm đồng bộ 5'),
    (N'K06', N'LTB06', N'Nhóm đồng bộ 6'),
    (N'K07', N'LTB07', N'Nhóm đồng bộ 7'),
    (N'K08', N'LTB08', N'Nhóm đồng bộ 8'),
    (N'K09', N'LTB09', N'Nhóm đồng bộ 9'),
    (N'K10', N'LTB10', N'Nhóm đồng bộ 10');
GO
INSERT INTO TBDB (maTBDB, maLoaiTBDB, tenTBDB,namSX, maNuocSX, maCCL, maDVT, maHinhThucNiemCat, maTinhTrangBaoGoi, maKho, maNhaKho, maKhu, maKhoi, maTang, maHom, maTrangThaiTB, viTri, soLuong, donGia, ghiChu, thoiGianTao, capNhatMoiNhat) VALUES
    (N'TBDB01', N'LTB01',N' BAO XE AK', 2013, N'NSX01', 1, N'DVT02', N'NC01', N'BG01', N'K01', N'NK01', N'DK01', N'KH01', N'T01', N'H01', N'TT01', N'Vị trí TBDB 1', 6, 500000, N'Ghi chú TBDB 1', DATEADD(DAY,-10+1,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB02', N'LTB02',N'hộp tiếp dạn súng AK', 2014, N'NSX02', 2, N'DVT02', N'NC02', N'BG02', N'K02', N'NK02', N'DK02', N'KH02', N'T02', N'H02', N'TT02', N'Vị trí TBDB 2', 7, 1000000, N'Ghi chú TBDB 2', DATEADD(DAY,-10+2,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB03', N'LTB03',N' áo chống đạn', 2015, N'NSX03', 3, N'DVT02', N'NC03', N'BG03', N'K03', N'NK03', N'DK03', N'KH03', N'T03', N'H03', N'TT03', N'Vị trí TBDB 3', 8, 1500000, N'Ghi chú TBDB 3', DATEADD(DAY,-10+3,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB04', N'LTB04',N'Thông nòng Ak', 2016, N'NSX04', 4, N'DVT02', N'NC04', N'BG04', N'K04', N'NK04', N'DK04', N'KH04', N'T04', N'H04', N'TT04', N'Vị trí TBDB 4', 9, 2000000, N'Ghi chú TBDB 4', DATEADD(DAY,-10+4,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB05', N'LTB05',N'Trang cụ AK', 2017, N'NSX05', 5, N'DVT02', N'NC05', N'BG05', N'K05', N'NK05', N'DK05', N'KH05', N'T05', N'H05', N'TT05', N'Vị trí TBDB 5', 10, 2500000, N'Ghi chú TBDB 5', DATEADD(DAY,-10+5,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB06', N'LTB06',N'Thông nòng dự phòng', 2018, N'NSX06', 1, N'DVT02', N'NC06', N'BG06', N'K06', N'NK06', N'DK06', N'KH06', N'T06', N'H06', N'TT06', N'Vị trí TBDB 6', 11, 3000000, N'Ghi chú TBDB 6', DATEADD(DAY,-10+6,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB07', N'LTB07',N'Kính ngắm dự phòng', 2019, N'NSX07', 2, N'DVT02', N'NC07', N'BG07', N'K07', N'NK07', N'DK07', N'KH07', N'T07', N'H07', N'TT07', N'Vị trí TBDB 7', 12, 3500000, N'Ghi chú TBDB 7', DATEADD(DAY,-10+7,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB08', N'LTB08',N'Lốp dự phòng', 2020, N'NSX08', 3, N'DVT02', N'NC08', N'BG08', N'K08', N'NK08', N'DK08', N'KH08', N'T08', N'H08', N'TT08', N'Vị trí TBDB 8', 13, 4000000, N'Ghi chú TBDB 8', DATEADD(DAY,-10+8,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB09', N'LTB09',N'Đèn chiếu sáng', 2021, N'NSX09', 4, N'DVT02', N'NC09', N'BG09', N'K09', N'NK09', N'DK09', N'KH09', N'T09', N'H09', N'TT09', N'Vị trí TBDB 9', 14, 4500000, N'Ghi chú TBDB 9', DATEADD(DAY,-10+9,SYSDATETIME()), SYSDATETIME()),
    (N'TBDB10', N'LTB10',N'Quân cụ đồng bộ', 2022, N'NSX10', 5, N'DVT02', N'NC02', N'BG10', N'K10', N'NK10', N'DK10', N'KH10', N'T10', N'H10', N'TT10', N'Vị trí TBDB 10', 15, 5000000, N'Ghi chú TBDB 10', DATEADD(DAY,-10+10,SYSDATETIME()), SYSDATETIME())
    ;
GO
INSERT INTO ChiTietDongBo ( maKieuSPKT, maLoaiTBDB, maTBDB, soLuongSPKTCoSo, SLDinhMuc, ghiChu) VALUES
    (N'K01', N'LTB01', N'TBDB01', 1, 2, NULL),
    ( N'K02', N'LTB02', N'TBDB02', 2, 3, NULL),
    ( N'K03', N'LTB03', N'TBDB03', 3, 4, NULL),
    ( N'K04', N'LTB04', N'TBDB04', 4, 5, NULL),
    ( N'K05', N'LTB05', N'TBDB05', 5, 6, NULL),
    ( N'K06', N'LTB06', N'TBDB06', 6, 7, NULL),
    ( N'K07', N'LTB07', N'TBDB07', 7, 8, NULL),
    ( N'K08', N'LTB08', N'TBDB08', 8, 9, NULL),
    ( N'K09', N'LTB09', N'TBDB09', 9, 10, NULL),
    ( N'K10', N'LTB10', N'TBDB10', 10, 11, NULL);
GO
INSERT INTO HoSoSPKT (soHieu, maLoaiSPKT, namSX, maNuocSX, maCCL, maDVT, maHinhThucNiemCat, maTinhTrangBaoGoi, maKho, maNhaKho, maKhu, maKhoi, maTang, maHom, maTrangThaiTB, viTri, soLuong, donGia, ghiChu, thoiGianTao, capNhatMoiNhat) VALUES
    (N'SPKT001', N'LSP01', 2011, N'NSX01', 1, N'DVT01', N'NC01', N'BG01', N'K01', N'NK01', N'DK01', N'KH01', N'T01', N'H01', N'TT01', N'Vị trí SPKT 1', 11, 1000000, N'Ghi chú SPKT 1', DATEADD(DAY,-10+1,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT002', N'LSP02', 2012, N'NSX02', 2, N'DVT01', N'NC02', N'BG02', N'K02', N'NK02', N'DK02', N'KH02', N'T02', N'H02', N'TT02', N'Vị trí SPKT 2', 12, 2000000, N'Ghi chú SPKT 2', DATEADD(DAY,-10+2,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT003', N'LSP03', 2013, N'NSX03', 3, N'DVT01', N'NC03', N'BG03', N'K03', N'NK03', N'DK03', N'KH03', N'T03', N'H03', N'TT03', N'Vị trí SPKT 3', 13, 3000000, N'Ghi chú SPKT 3', DATEADD(DAY,-10+3,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT004', N'LSP04', 2014, N'NSX04', 4, N'DVT01', N'NC04', N'BG04', N'K04', N'NK04', N'DK04', N'KH04', N'T04', N'H04', N'TT04', N'Vị trí SPKT 4', 14, 4000000, N'Ghi chú SPKT 4', DATEADD(DAY,-10+4,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT005', N'LSP05', 2015, N'NSX05', 5, N'DVT01', N'NC05', N'BG05', N'K05', N'NK05', N'DK05', N'KH05', N'T05', N'H05', N'TT05', N'Vị trí SPKT 5', 15, 5000000, N'Ghi chú SPKT 5', DATEADD(DAY,-10+5,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT006', N'LSP06', 2016, N'NSX06', 1, N'DVT01', N'NC06', N'BG06', N'K06', N'NK06', N'DK06', N'KH06', N'T06', N'H06', N'TT06', N'Vị trí SPKT 6', 16, 6000000, N'Ghi chú SPKT 6', DATEADD(DAY,-10+6,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT007', N'LSP07', 2017, N'NSX07', 2, N'DVT01', N'NC07', N'BG07', N'K07', N'NK07', N'DK07', N'KH07', N'T07', N'H07', N'TT07', N'Vị trí SPKT 7', 17, 7000000, N'Ghi chú SPKT 7', DATEADD(DAY,-10+7,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT008', N'LSP08', 2018, N'NSX08', 3, N'DVT01', N'NC08', N'BG08', N'K08', N'NK08', N'DK08', N'KH08', N'T08', N'H08', N'TT08', N'Vị trí SPKT 8', 18, 8000000, N'Ghi chú SPKT 8', DATEADD(DAY,-10+8,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT009', N'LSP09', 2019, N'NSX09', 4, N'DVT01', N'NC09', N'BG09', N'K09', N'NK09', N'DK09', N'KH09', N'T09', N'H09', N'TT09', N'Vị trí SPKT 9', 19, 9000000, N'Ghi chú SPKT 9', DATEADD(DAY,-10+9,SYSDATETIME()), SYSDATETIME()),
    (N'SPKT010', N'LSP10', 2020, N'NSX10', 5, N'DVT01', N'NC01', N'BG10', N'K10', N'NK10', N'DK10', N'KH10', N'T10', N'H10', N'TT10', N'Vị trí SPKT 10', 20, 10000000, N'Ghi chú SPKT 10', DATEADD(DAY,-10+10,SYSDATETIME()), SYSDATETIME());
GO

INSERT INTO DotKiemKe (maDotKiemKe, tenDotKiemKe, ngayBatDau, ngayKetThuc, trangThai, noiDung, ghiChu) VALUES
    (N'DKK01', N'Đợt kiểm kê 1', N'2025-01-01', N'2025-01-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 1', NULL),
    (N'DKK02', N'Đợt kiểm kê 2', N'2025-02-01', N'2025-02-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 2', NULL),
    (N'DKK03', N'Đợt kiểm kê 3', N'2025-03-01', N'2025-03-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 3', NULL),
    (N'DKK04', N'Đợt kiểm kê 4', N'2025-04-01', N'2025-04-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 4', NULL),
    (N'DKK05', N'Đợt kiểm kê 5', N'2025-05-01', N'2025-05-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 5', NULL),
    (N'DKK06', N'Đợt kiểm kê 6', N'2025-06-01', N'2025-06-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 6', NULL),
    (N'DKK07', N'Đợt kiểm kê 7', N'2025-07-01', N'2025-07-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 7', NULL),
    (N'DKK08', N'Đợt kiểm kê 8', N'2025-08-01', N'2025-08-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 8', NULL),
    (N'DKK09', N'Đợt kiểm kê 9', N'2025-09-01', N'2025-09-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 9', NULL),
    (N'DKK10', N'Đợt kiểm kê 10', N'2025-10-01', N'2025-10-15', N'HOAN_THANH', N'Kiểm kê định kỳ đợt 10', NULL);
GO
INSERT INTO PhieuKiemKe (maPhieuKiemKe, maDotKiemKe, ngayLap, ngayKiemKe, maKho, nhomTB, noiDung, trangThai, nguoiTao, nguoiKiemKe, ngayKetThuc) VALUES
    (N'PKK01', N'DKK01', N'2025-01-01', N'2025-01-05', N'K01', N'Trang bị chính', N'Nội dung kiểm kê 1', N'DA_KET_THUC', N'Người tạo 1', N'Người kiểm kê 1', N'2025-01-10'),
    (N'PKK02', N'DKK02', N'2025-02-01', N'2025-02-05', N'K02', N'Trang bị đồng bộ', N'Nội dung kiểm kê 2', N'DA_KET_THUC', N'Người tạo 2', N'Người kiểm kê 2', N'2025-02-10'),
    (N'PKK03', N'DKK03', N'2025-03-01', N'2025-03-05', N'K03', N'Trang bị chính', N'Nội dung kiểm kê 3', N'DA_KET_THUC', N'Người tạo 3', N'Người kiểm kê 3', N'2025-03-10'),
    (N'PKK04', N'DKK04', N'2025-04-01', N'2025-04-05', N'K04', N'Trang bị đồng bộ', N'Nội dung kiểm kê 4', N'DA_KET_THUC', N'Người tạo 4', N'Người kiểm kê 4', N'2025-04-10'),
    (N'PKK05', N'DKK05', N'2025-05-01', N'2025-05-05', N'K05', N'Trang bị chính', N'Nội dung kiểm kê 5', N'DA_KET_THUC', N'Người tạo 5', N'Người kiểm kê 5', N'2025-05-10'),
    (N'PKK06', N'DKK06', N'2025-06-01', N'2025-06-05', N'K06', N'Trang bị đồng bộ', N'Nội dung kiểm kê 6', N'DA_KET_THUC', N'Người tạo 6', N'Người kiểm kê 6', N'2025-06-10'),
    (N'PKK07', N'DKK07', N'2025-07-01', N'2025-07-05', N'K07', N'Trang bị chính', N'Nội dung kiểm kê 7', N'DA_KET_THUC', N'Người tạo 7', N'Người kiểm kê 7', N'2025-07-10'),
    (N'PKK08', N'DKK08', N'2025-08-01', N'2025-08-05', N'K08', N'Trang bị đồng bộ', N'Nội dung kiểm kê 8', N'DA_KET_THUC', N'Người tạo 8', N'Người kiểm kê 8', N'2025-08-10'),
    (N'PKK09', N'DKK09', N'2025-09-01', N'2025-09-05', N'K09', N'Trang bị chính', N'Nội dung kiểm kê 9', N'DA_KET_THUC', N'Người tạo 9', N'Người kiểm kê 9', N'2025-09-10'),
    (N'PKK10', N'DKK10', N'2025-10-01', N'2025-10-05', N'K10', N'Trang bị đồng bộ', N'Nội dung kiểm kê 10', N'DA_KET_THUC', N'Người tạo 10', N'Người kiểm kê 10', N'2025-10-10');
GO
INSERT INTO ChiTietKiemKe (maPhieuKiemKe, maLoaiSPKT, maTBDB, soLuongKyTruoc, soTang, soGiam, soLuongSoSach, soLuongThucTe, ghiChu) VALUES
    (N'PKK01', N'LSP01', NULL, 101, 5, 2, 104, 103, NULL),
    (N'PKK02', NULL, N'TBDB02', 52, 3, 1, 54, 55, NULL),
    (N'PKK03', N'LSP03', NULL, 103, 5, 2, 106, 105, NULL),
    (N'PKK04', NULL, N'TBDB04', 54, 3, 1, 56, 57, NULL),
    (N'PKK05', N'LSP05', NULL, 105, 5, 2, 108, 107, NULL),
    (N'PKK06', NULL, N'TBDB06', 56, 3, 1, 58, 59, NULL),
    (N'PKK07', N'LSP07', NULL, 107, 5, 2, 110, 109, NULL),
    (N'PKK08', NULL, N'TBDB08', 58, 3, 1, 60, 61, NULL),
    (N'PKK09', N'LSP09', NULL, 109, 5, 2, 112, 111, NULL),
    (N'PKK10', NULL, N'TBDB10', 60, 3, 1, 62, 63, NULL);
GO


SET IDENTITY_INSERT NguoiDung ON;
INSERT INTO NguoiDung
(maND, tenDangNhap, matKhauHash, hoTen, maCapBac, maChucVu, maDonVi, email, soDienThoai,
 avatarURL, isActive, biKhoa, lyDoKhoa, lanDangNhapCuoi, soLanSaiMK, createdAt, createdBy, updatedAt, updatedBy)
VALUES
    (1, 'user01', '$2b$12$MauHashKhongDungChoSanXuat01', N'Người dùng 1', 'CB01', 'CV01', 'K01', 'user01@example.com', '0980000001', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (2, 'user02', '$2b$12$MauHashKhongDungChoSanXuat02', N'Người dùng 2', 'CB02', 'CV02', 'K02', 'user02@example.com', '0980000002', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (3, 'user03', '$2b$12$MauHashKhongDungChoSanXuat03', N'Người dùng 3', 'CB03', 'CV03', 'K03', 'user03@example.com', '0980000003', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (4, 'user04', '$2b$12$MauHashKhongDungChoSanXuat04', N'Người dùng 4', 'CB04', 'CV04', 'K04', 'user04@example.com', '0980000004', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (5, 'user05', '$2b$12$MauHashKhongDungChoSanXuat05', N'Người dùng 5', 'CB05', 'CV05', 'K05', 'user05@example.com', '0980000005', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (6, 'user06', '$2b$12$MauHashKhongDungChoSanXuat06', N'Người dùng 6', 'CB06', 'CV06', 'K06', 'user06@example.com', '0980000006', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (7, 'user07', '$2b$12$MauHashKhongDungChoSanXuat07', N'Người dùng 7', 'CB07', 'CV07', 'K07', 'user07@example.com', '0980000007', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (8, 'user08', '$2b$12$MauHashKhongDungChoSanXuat08', N'Người dùng 8', 'CB08', 'CV08', 'K08', 'user08@example.com', '0980000008', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (9, 'user09', '$2b$12$MauHashKhongDungChoSanXuat09', N'Người dùng 9', 'CB09', 'CV09', 'K09', 'user09@example.com', '0980000009', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL),
    (10, 'user10', '$2b$12$MauHashKhongDungChoSanXuat10', N'Người dùng 10', 'CB10', 'CV10', 'K10', 'user10@example.com', '0980000010', NULL, 1, 0, NULL, SYSDATETIME(), 0, SYSDATETIME(), NULL, NULL, NULL);
SET IDENTITY_INSERT NguoiDung OFF;
GO
INSERT INTO VaiTro (maVaiTro, tenVaiTro, moTa) VALUES
    (N'ADMIN', N'Quản trị hệ thống', N'Toàn quyền hệ thống'),
    (N'QUAN_LY', N'Quản lý', N'Quản lý nghiệp vụ'),
    (N'THU_KHO', N'Thủ kho', N'Quản lý kho'),
    (N'KIEM_KE', N'Kiểm kê viên', N'Thực hiện kiểm kê'),
    (N'NHAP_XUAT', N'Nhân viên nhập xuất', N'Lập và xử lý lệnh'),
    (N'KY_THUAT', N'Nhân viên kỹ thuật', N'Quản lý kỹ thuật'),
    (N'PHE_DUYET', N'Người phê duyệt', N'Phê duyệt chứng từ'),
    (N'BAO_CAO', N'Nhân viên báo cáo', N'Khai thác báo cáo'),
    (N'CHI_XEM', N'Chỉ xem', N'Chỉ có quyền xem'),
    (N'KHACH', N'Khách', N'Quyền hạn chế');
GO
INSERT INTO NguoiDungVaiTro (maNguoiDung, maVaiTro, ghiChu) VALUES
    (1, N'ADMIN', NULL),
    (2, N'QUAN_LY', NULL),
    (3, N'THU_KHO', NULL),
    (4, N'KIEM_KE', NULL),
    (5, N'NHAP_XUAT', NULL),
    (6, N'KY_THUAT', NULL),
    (7, N'PHE_DUYET', NULL),
    (8, N'BAO_CAO', NULL),
    (9, N'CHI_XEM', NULL),
    (10, N'KHACH', NULL);
GO
INSERT INTO ChucNang (maCN, tenCN, ghiChu) VALUES
    (N'DANH_MUC', N'Quản lý danh mục', NULL),
    (N'NHOM_I', N'Nghiệp vụ nhóm I', NULL),
    (N'NHOM_II', N'Nghiệp vụ nhóm II', NULL),
    (N'LENH', N'Quản lý lệnh', NULL),
    (N'BDKT', N'Bảo đảm kỹ thuật', NULL),
    (N'KTKT', N'Kỹ thuật kiểm tra', NULL),
    (N'KIEM_KE', N'Quản lý kiểm kê', NULL),
    (N'BAO_CAO', N'Báo cáo thống kê', NULL),
    (N'HE_THONG', N'Quản trị hệ thống', NULL),
    (N'CHUYEN_KY', N'Chuyển kỳ dữ liệu', NULL);
GO

SET IDENTITY_INSERT Quyen ON;
INSERT INTO Quyen (maQuyen, tenQuyen, ghiChu) VALUES
(1,'XEM',N'Xem dữ liệu'),
(2,'THEM',N'Thêm dữ liệu'),
(3,'SUA',N'Sửa dữ liệu'),
(4,'XOA',N'Xóa dữ liệu'),
(5,'PHE_DUYET',N'Phê duyệt'),
(6,'HUY_DUYET',N'Hủy phê duyệt'),
(7,'IN',N'In chứng từ'),
(8,'XUAT_FILE',N'Xuất tệp'),
(9,'CHUYEN_KY',N'Thực hiện chuyển kỳ'),
(10,'QUAN_TRI',N'Quản trị hệ thống');
SET IDENTITY_INSERT Quyen OFF;
GO
INSERT INTO VaiTroChucNangQuyen (maVaiTro, maQuyen, maCN) VALUES
    (N'ADMIN', 10, N'HE_THONG'),
    (N'QUAN_LY', 1, N'BAO_CAO'),
    (N'THU_KHO', 2, N'DANH_MUC'),
    (N'KIEM_KE', 2, N'KIEM_KE'),
    (N'NHAP_XUAT', 2, N'LENH'),
    (N'KY_THUAT', 3, N'KTKT'),
    (N'PHE_DUYET', 5, N'LENH'),
    (N'BAO_CAO', 8, N'BAO_CAO'),
    (N'CHI_XEM', 1, N'DANH_MUC'),
    (N'ADMIN', 9, N'CHUYEN_KY');
GO
INSERT INTO NhatKyHoatDong (maNguoiDung, tenDangNhap, hanhDong, doiTuong, maDoiTuong, moTa, duLieuTruoc, duLieuSau, thoiGian, ketQua, lyDoThatBai) VALUES
    (1, N'user01', N'DANG_NHAP', N'NguoiDung', N'1', N'Nhật ký hoạt động mẫu 1', NULL, NULL, DATEADD(MINUTE,-1,SYSDATETIME()), N'THANH_CONG', NULL),
    (2, N'user02', N'XEM', N'HoSo_SPKT', N'2', N'Nhật ký hoạt động mẫu 2', NULL, NULL, DATEADD(MINUTE,-2,SYSDATETIME()), N'THANH_CONG', NULL),
    (3, N'user03', N'THEM', N'Lenh', N'3', N'Nhật ký hoạt động mẫu 3', NULL, NULL, DATEADD(MINUTE,-3,SYSDATETIME()), N'THANH_CONG', NULL),
    (4, N'user04', N'SUA', N'TBDB', N'4', N'Nhật ký hoạt động mẫu 4', NULL, NULL, DATEADD(MINUTE,-4,SYSDATETIME()), N'THANH_CONG', NULL),
    (5, N'user05', N'XOA', N'Kho', N'5', N'Nhật ký hoạt động mẫu 5', NULL, NULL, DATEADD(MINUTE,-5,SYSDATETIME()), N'THANH_CONG', NULL),
    (6, N'user06', N'PHE_DUYET', N'PhieuKiemKe', N'6', N'Nhật ký hoạt động mẫu 6', NULL, NULL, DATEADD(MINUTE,-6,SYSDATETIME()), N'THANH_CONG', NULL),
    (7, N'user07', N'DANG_XUAT', N'NguoiDung', N'7', N'Nhật ký hoạt động mẫu 7', NULL, NULL, DATEADD(MINUTE,-7,SYSDATETIME()), N'THANH_CONG', NULL),
    (8, N'user08', N'XEM', N'BaoCao', N'8', N'Nhật ký hoạt động mẫu 8', NULL, NULL, DATEADD(MINUTE,-8,SYSDATETIME()), N'THANH_CONG', NULL),
    (9, N'user09', N'THEM', N'ChuyenKy', N'9', N'Nhật ký hoạt động mẫu 9', NULL, NULL, DATEADD(MINUTE,-9,SYSDATETIME()), N'THANH_CONG', NULL),
    (10, N'user10', N'SUA', N'LoaiSPKT', N'10', N'Nhật ký hoạt động mẫu 10', NULL, NULL, DATEADD(MINUTE,-10,SYSDATETIME()), N'THANH_CONG', NULL);
GO

