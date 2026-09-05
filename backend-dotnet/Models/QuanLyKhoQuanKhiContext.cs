using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Models;

public partial class QuanLyKhoQuanKhiContext : DbContext
{
    public QuanLyKhoQuanKhiContext(DbContextOptions<QuanLyKhoQuanKhiContext> options)
        : base(options)
    {
    }

    public virtual DbSet<CapBac> CapBacs { get; set; }

    public virtual DbSet<CapChatLuong> CapChatLuongs { get; set; }

    public virtual DbSet<ChiTietDongBo> ChiTietDongBos { get; set; }

    public virtual DbSet<ChiTietKiemKe> ChiTietKiemKes { get; set; }

    public virtual DbSet<ChiTietKiemKeViTri> ChiTietKiemKeViTris { get; set; }

    public virtual DbSet<ChiTietLenh> ChiTietLenhs { get; set; }

    public virtual DbSet<ChiTietLenhChuyenCap> ChiTietLenhChuyenCaps { get; set; }

    public virtual DbSet<ChiTietLenhThayDoiViTri> ChiTietLenhThayDoiViTris { get; set; }

    public virtual DbSet<ChiTietTcnx> ChiTietTcnxes { get; set; }

    public virtual DbSet<ChucNang> ChucNangs { get; set; }

    public virtual DbSet<ChucVu> ChucVus { get; set; }

    public virtual DbSet<ChuyenKy> ChuyenKies { get; set; }

    public virtual DbSet<CtdongBoTrongLenh> CtdongBoTrongLenhs { get; set; }

    public virtual DbSet<CtXuatKho> CtXuatKhos { get; set; }

    public virtual DbSet<DinhKhu> DinhKhus { get; set; }

    public virtual DbSet<DotKiemKe> DotKiemKes { get; set; }

    public virtual DbSet<Dvt> Dvts { get; set; }

    public virtual DbSet<GiaHang> GiaHangs { get; set; }

    public virtual DbSet<HangSx> HangSxes { get; set; }

    public virtual DbSet<HinhThucNiemCat> HinhThucNiemCats { get; set; }

    public virtual DbSet<HoSoSpkt> HoSoSpkts { get; set; }

    public virtual DbSet<Hom> Homs { get; set; }

    public virtual DbSet<Httt> Httts { get; set; }

    public virtual DbSet<HtvanChuyen> HtvanChuyens { get; set; }

    public virtual DbSet<Kho> Khos { get; set; }

    public virtual DbSet<KhoiHang> KhoiHangs { get; set; }

    public virtual DbSet<KieuSpkt> KieuSpkts { get; set; }

    public virtual DbSet<Lenh> Lenhs { get; set; }

    public virtual DbSet<LenhChuyenCap> LenhChuyenCaps { get; set; }

    public virtual DbSet<LenhThayDoiViTri> LenhThayDoiViTris { get; set; }

    public virtual DbSet<LoTbdb> LoTbdbs { get; set; }

    public virtual DbSet<LoaiKho> LoaiKhos { get; set; }

    public virtual DbSet<LoaiSpkt> LoaiSpkts { get; set; }

    public virtual DbSet<LoaiTbdb> LoaiTbdbs { get; set; }

    public virtual DbSet<Ncc> Nccs { get; set; }

    public virtual DbSet<NguoiDung> NguoiDungs { get; set; }

    public virtual DbSet<NguoiDungVaiTro> NguoiDungVaiTros { get; set; }

    public virtual DbSet<NhaKho> NhaKhos { get; set; }

    public virtual DbSet<NhatKyHoatDong> NhatKyHoatDongs { get; set; }

    public virtual DbSet<NhomDongBo> NhomDongBos { get; set; }

    public virtual DbSet<NhomSpkt> NhomSpkts { get; set; }

    public virtual DbSet<Nsx> Nsxes { get; set; }

    public virtual DbSet<PhieuKiemKe> PhieuKiemKes { get; set; }

    public virtual DbSet<Quyen> Quyens { get; set; }

    public virtual DbSet<SpkttrongLenh> SpkttrongLenhs { get; set; }

    public virtual DbSet<Tang> Tangs { get; set; }

    public virtual DbSet<Tbdb> Tbdbs { get; set; }

    public virtual DbSet<Tinh> Tinhs { get; set; }

    public virtual DbSet<TinhChatNhapXuat> TinhChatNhapXuats { get; set; }

    public virtual DbSet<TinhTrangBaoGoi> TinhTrangBaoGois { get; set; }

    public virtual DbSet<TonDauKy> TonDauKies { get; set; }

    public virtual DbSet<TonKhoTbdb> TonKhoTbdbs { get; set; }

    public virtual DbSet<TrangThaiTb> TrangThaiTbs { get; set; }

    public virtual DbSet<VaiTro> VaiTros { get; set; }

    public virtual DbSet<VaiTroChucNangQuyen> VaiTroChucNangQuyens { get; set; }

    public virtual DbSet<Xa> Xas { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CapBac>(entity =>
        {
            entity.HasKey(e => e.MaCapBac).HasName("PK__CapBac__0284A5335FAED640");

            entity.ToTable("CapBac");

            entity.Property(e => e.MaCapBac)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maCapBac");
            entity.Property(e => e.TenCapBac)
                .HasMaxLength(100)
                .HasColumnName("tenCapBac");
            entity.Property(e => e.ThuTu).HasColumnName("thuTu");
        });

        modelBuilder.Entity<CapChatLuong>(entity =>
        {
            entity.HasKey(e => e.MaCap).HasName("PK__CapChatL__2C8F2FF46C723650");

            entity.ToTable("CapChatLuong");

            entity.Property(e => e.MaCap)
                .ValueGeneratedNever()
                .HasColumnName("maCap");
            entity.Property(e => e.MoTa)
                .HasMaxLength(500)
                .HasColumnName("moTa");
            entity.Property(e => e.TenCap)
                .HasMaxLength(100)
                .HasColumnName("tenCap");
        });

        modelBuilder.Entity<ChiTietDongBo>(entity =>
        {
            entity.HasKey(e => new { e.MaKieuSpkt, e.MaLoaiTbdb, e.MaTbdb });

            entity.ToTable("ChiTietDongBo");

            entity.Property(e => e.MaKieuSpkt)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKieuSPKT");
            entity.Property(e => e.MaLoaiTbdb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maLoaiTBDB");
            entity.Property(e => e.MaTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTBDB");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.SldinhMuc).HasColumnName("SLDinhMuc");
            entity.Property(e => e.SoLuongSpktcoSo)
                .HasDefaultValue(1)
                .HasColumnName("soLuongSPKTCoSo");

            entity.HasOne(d => d.MaTbdbNavigation).WithMany(p => p.ChiTietDongBos)
                .HasForeignKey(d => d.MaTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTDB_TBDB");

            entity.HasOne(d => d.NhomDongBo).WithMany(p => p.ChiTietDongBos)
                .HasForeignKey(d => new { d.MaKieuSpkt, d.MaLoaiTbdb })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTDB_NhomDongBo");
        });

        modelBuilder.Entity<ChiTietKiemKe>(entity =>
        {
            entity.HasKey(e => e.MaCtkiemKe).HasName("PK__ChiTietK__2B0E672FC7C31F4B");

            entity.ToTable("ChiTietKiemKe");

            entity.Property(e => e.MaCtkiemKe).HasColumnName("maCTKiemKe");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaLoaiSpkt)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoaiSPKT");
            entity.Property(e => e.MaPhieuKiemKe)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maPhieuKiemKe");
            entity.Property(e => e.MaTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTBDB");
            entity.Property(e => e.MaCcl).HasColumnName("maCCL");
            entity.Property(e => e.SoGiam).HasColumnName("soGiam");
            entity.Property(e => e.SoLuongKyTruoc).HasColumnName("soLuongKyTruoc");
            entity.Property(e => e.SoLuongSoSach).HasColumnName("soLuongSoSach");
            entity.Property(e => e.SoLuongThucTe).HasColumnName("soLuongThucTe");
            entity.Property(e => e.SoTang).HasColumnName("soTang");
            entity.Property(e => e.Thieu)
                .HasComputedColumnSql("(case when [soLuongSoSach]>[soLuongThucTe] then [soLuongSoSach]-[soLuongThucTe] else (0) end)", true)
                .HasColumnName("thieu");
            entity.Property(e => e.Thua)
                .HasComputedColumnSql("(case when [soLuongThucTe]>[soLuongSoSach] then [soLuongThucTe]-[soLuongSoSach] else (0) end)", true)
                .HasColumnName("thua");

            entity.HasOne(d => d.MaCclNavigation).WithMany(p => p.ChiTietKiemKes)
                .HasForeignKey(d => d.MaCcl)
                .HasConstraintName("FK_CTKT_CCL");

            entity.HasOne(d => d.MaLoaiSpktNavigation).WithMany(p => p.ChiTietKiemKes)
                .HasForeignKey(d => d.MaLoaiSpkt)
                .HasConstraintName("FK_CTKT_LoaiSPKT");

            entity.HasOne(d => d.MaPhieuKiemKeNavigation).WithMany(p => p.ChiTietKiemKes)
                .HasForeignKey(d => d.MaPhieuKiemKe)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTKT_Phieu");

            entity.HasOne(d => d.MaTbdbNavigation).WithMany(p => p.ChiTietKiemKes)
                .HasForeignKey(d => d.MaTbdb)
                .HasConstraintName("FK_CTKT_TBDB");
        });

        modelBuilder.Entity<ChiTietKiemKeViTri>(entity =>
        {
            entity.HasKey(e => e.MaCtkiemKeViTri);

            entity.ToTable("ChiTietKiemKeViTri");

            entity.Property(e => e.MaCtkiemKeViTri).HasColumnName("maCTKiemKeViTri");
            entity.Property(e => e.MaCtkiemKe).HasColumnName("maCTKiemKe");
            entity.Property(e => e.MaLoTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoTBDB");
            entity.Property(e => e.MaTonKho).HasColumnName("maTonKho");
            entity.Property(e => e.TenNhaKho).HasMaxLength(100).HasColumnName("tenNhaKho");
            entity.Property(e => e.TenDinhKhu).HasMaxLength(100).HasColumnName("tenDinhKhu");
            entity.Property(e => e.TenKhoi).HasMaxLength(100).HasColumnName("tenKhoi");
            entity.Property(e => e.TenGia).HasMaxLength(100).HasColumnName("tenGia");
            entity.Property(e => e.TenTang).HasMaxLength(100).HasColumnName("tenTang");
            entity.Property(e => e.TenHom).HasMaxLength(100).HasColumnName("tenHom");
            entity.Property(e => e.MoTaViTri).HasMaxLength(300).HasColumnName("moTaViTri");
            entity.Property(e => e.SoLuongSoSach).HasColumnName("soLuongSoSach");
            entity.Property(e => e.SoLuongThucTe).HasColumnName("soLuongThucTe");
            entity.Property(e => e.GhiChu).HasMaxLength(500).HasColumnName("ghiChu");
            entity.Property(e => e.Thieu)
                .HasComputedColumnSql("(case when [soLuongSoSach]>[soLuongThucTe] then [soLuongSoSach]-[soLuongThucTe] else (0) end)", true)
                .HasColumnName("thieu");
            entity.Property(e => e.Thua)
                .HasComputedColumnSql("(case when [soLuongThucTe]>[soLuongSoSach] then [soLuongThucTe]-[soLuongSoSach] else (0) end)", true)
                .HasColumnName("thua");

            entity.HasOne(d => d.MaCtkiemKeNavigation).WithMany(p => p.ChiTietKiemKeViTris)
                .HasForeignKey(d => d.MaCtkiemKe)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTKTVT_CTKT");

            entity.HasOne(d => d.MaLoTbdbNavigation).WithMany(p => p.ChiTietKiemKeViTris)
                .HasForeignKey(d => d.MaLoTbdb)
                .HasConstraintName("FK_CTKTVT_LoTBDB");

            entity.HasOne(d => d.MaTonKhoNavigation).WithMany(p => p.ChiTietKiemKeViTris)
                .HasForeignKey(d => d.MaTonKho)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_CTKTVT_TonKhoTBDB");
        });

        modelBuilder.Entity<ChiTietLenhChuyenCap>(entity =>
        {
            entity.HasKey(e => e.MaCtlenhChuyenCap);

            entity.ToTable("ChiTietLenhChuyenCap");

            entity.Property(e => e.MaCtlenhChuyenCap).HasColumnName("maCTLenhChuyenCap");
            entity.Property(e => e.MaLenh)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLenh");
            entity.Property(e => e.MaLoTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoTBDB");
            entity.Property(e => e.MaTonKho).HasColumnName("maTonKho");
            entity.Property(e => e.MaCclCu).HasColumnName("maCclCu");
            entity.Property(e => e.MaCclMoi).HasColumnName("maCclMoi");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");
            entity.Property(e => e.TrangThaiGoc)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("trangThaiGoc");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");

            entity.HasOne(d => d.MaLenhNavigation).WithMany(p => p.ChiTietLenhChuyenCaps)
                .HasForeignKey(d => d.MaLenh)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_CTLCC_Lenh");

            entity.HasOne(d => d.MaLoTbdbNavigation).WithMany()
                .HasForeignKey(d => d.MaLoTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTLCC_LoTBDB");

            entity.HasOne(d => d.MaTonKhoNavigation).WithMany()
                .HasForeignKey(d => d.MaTonKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTLCC_TonKhoTBDB");

            entity.HasOne(d => d.MaCclCuNavigation).WithMany()
                .HasForeignKey(d => d.MaCclCu)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTLCC_CclCu");

            entity.HasOne(d => d.MaCclMoiNavigation).WithMany()
                .HasForeignKey(d => d.MaCclMoi)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTLCC_CclMoi");
        });

        modelBuilder.Entity<ChiTietLenhThayDoiViTri>(entity =>
        {
            entity.HasKey(e => e.MaCtlenhThayDoiViTri);

            entity.ToTable("ChiTietLenhThayDoiViTri");

            entity.Property(e => e.MaCtlenhThayDoiViTri).HasColumnName("maCTLenhThayDoiViTri");
            entity.Property(e => e.MaLenh)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLenh");
            entity.Property(e => e.MaLoTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoTBDB");
            entity.Property(e => e.MaTonKho).HasColumnName("maTonKho");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");
            entity.Property(e => e.TenNhaKhoMoi).HasMaxLength(200).HasColumnName("tenNhaKhoMoi");
            entity.Property(e => e.TenDinhKhuMoi).HasMaxLength(200).HasColumnName("tenDinhKhuMoi");
            entity.Property(e => e.TenKhoiMoi).HasMaxLength(200).HasColumnName("tenKhoiMoi");
            entity.Property(e => e.TenGiaMoi).HasMaxLength(200).HasColumnName("tenGiaMoi");
            entity.Property(e => e.TenTangMoi).HasMaxLength(200).HasColumnName("tenTangMoi");
            entity.Property(e => e.TenHomMoi).HasMaxLength(200).HasColumnName("tenHomMoi");
            entity.Property(e => e.MoTaViTriMoi).HasMaxLength(600).HasColumnName("moTaViTriMoi");
            entity.Property(e => e.TrangThaiGoc)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("trangThaiGoc");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(1000)
                .HasColumnName("ghiChu");

            entity.HasOne(d => d.MaLenhNavigation).WithMany(p => p.ChiTietLenhThayDoiViTris)
                .HasForeignKey(d => d.MaLenh)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_CTLenhThayDoiViTri_Lenh");

            entity.HasOne(d => d.MaLoTbdbNavigation).WithMany()
                .HasForeignKey(d => d.MaLoTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTLenhThayDoiViTri_Lo");

            entity.HasOne(d => d.MaTonKhoNavigation).WithMany()
                .HasForeignKey(d => d.MaTonKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTLenhThayDoiViTri_TonKho");
        });

        modelBuilder.Entity<ChiTietLenh>(entity =>
        {
            entity.HasKey(e => e.MaCtlenh).HasName("PK__ChiTietL__4E322F63984A1194");

            entity.ToTable("ChiTietLenh");

            entity.Property(e => e.MaCtlenh).HasColumnName("maCTLenh");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaCcl).HasColumnName("maCCL");
            entity.Property(e => e.MaLenh)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLenh");
            entity.Property(e => e.MaLoaiSpkt)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoaiSPKT");
            entity.Property(e => e.MaLoaiTbdb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maLoaiTBDB");
            entity.Property(e => e.SlThuc).HasColumnName("slThuc");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");

            entity.HasOne(d => d.MaCclNavigation).WithMany(p => p.ChiTietLenhs)
                .HasForeignKey(d => d.MaCcl)
                .HasConstraintName("FK_CTL_CapChatLuong");

            entity.HasOne(d => d.MaLenhNavigation).WithMany(p => p.ChiTietLenhs)
                .HasForeignKey(d => d.MaLenh)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTL_Lenh");

            entity.HasOne(d => d.MaLoaiSpktNavigation).WithMany(p => p.ChiTietLenhs)
                .HasForeignKey(d => d.MaLoaiSpkt)
                .HasConstraintName("FK_CTL_LoaiSPKT");

            entity.HasOne(d => d.MaLoaiTbdbNavigation).WithMany(p => p.ChiTietLenhs)
                .HasForeignKey(d => d.MaLoaiTbdb)
                .HasConstraintName("FK_CTL_LoaiTBDB");
        });

        modelBuilder.Entity<ChiTietTcnx>(entity =>
        {
            entity.HasKey(e => e.MaCtnx).HasName("PK__ChiTietT__FD27ADA6E22C010A");

            entity.ToTable("ChiTietTCNX");

            entity.Property(e => e.MaCtnx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maCTNX");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaNx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNX");
            entity.Property(e => e.TenCtnx)
                .HasMaxLength(200)
                .HasColumnName("tenCTNX");

            entity.HasOne(d => d.MaNxNavigation).WithMany(p => p.ChiTietTcnxes)
                .HasForeignKey(d => d.MaNx)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietTCNX_TCNX");
        });

        modelBuilder.Entity<ChucNang>(entity =>
        {
            entity.HasKey(e => e.MaCn).HasName("PK__ChucNang__7A3E0CE82E43E84F");

            entity.ToTable("ChucNang");

            entity.Property(e => e.MaCn)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maCN");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(100)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenCn)
                .HasMaxLength(200)
                .HasColumnName("tenCN");
        });

        modelBuilder.Entity<ChucVu>(entity =>
        {
            entity.HasKey(e => e.MaChucVu).HasName("PK__ChucVu__6E42BCD9C0A0457B");

            entity.ToTable("ChucVu");

            entity.Property(e => e.MaChucVu)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maChucVu");
            entity.Property(e => e.MoTa)
                .HasMaxLength(500)
                .HasColumnName("moTa");
            entity.Property(e => e.TenChucVu)
                .HasMaxLength(200)
                .HasColumnName("tenChucVu");
        });

        modelBuilder.Entity<ChuyenKy>(entity =>
        {
            entity.HasKey(e => e.MaChuyenKy).HasName("PK__ChuyenKy__74A7910EF758B1AB");

            entity.ToTable("ChuyenKy");

            entity.Property(e => e.MaChuyenKy)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maChuyenKy");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaPhieuKiemKe)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maPhieuKiemKe");
            entity.Property(e => e.NamCu).HasColumnName("namCu");
            entity.Property(e => e.NamMoi).HasColumnName("namMoi");
            entity.Property(e => e.NgayChuyen).HasColumnName("ngayChuyen");
            entity.Property(e => e.NguoiThucHien)
                .HasMaxLength(100)
                .HasColumnName("nguoiThucHien");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .HasColumnName("trangThai");

            entity.HasOne(d => d.MaPhieuKiemKeNavigation).WithMany(p => p.ChuyenKies)
                .HasForeignKey(d => d.MaPhieuKiemKe)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChuyenKy_PhieuKK");
        });

        modelBuilder.Entity<CtdongBoTrongLenh>(entity =>
        {
            entity.HasKey(e => e.MaCtdongBoLenh);

            entity.ToTable("CTDongBoTrongLenh");

            entity.Property(e => e.MaCtdongBoLenh).HasColumnName("maCTDongBoLenh");
            entity.Property(e => e.DonGiaTheoLenh)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("donGiaTheoLenh");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaCcl).HasColumnName("maCCL");
            entity.Property(e => e.MaLenh)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLenh");
            entity.Property(e => e.MaTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTBDB");
            entity.Property(e => e.SoLuongTheoLenh).HasColumnName("soLuongTheoLenh");
            entity.Property(e => e.SoLuongThuc).HasColumnName("soLuongThuc");
            entity.Property(e => e.MaTonKho).HasColumnName("maTonKho");

            entity.HasOne(d => d.MaCclNavigation).WithMany(p => p.CtdongBoTrongLenhs)
                .HasForeignKey(d => d.MaCcl)
                .HasConstraintName("FK_CTDBTL_CapChatLuong");

            entity.HasOne(d => d.MaLenhNavigation).WithMany(p => p.CtdongBoTrongLenhs)
                .HasForeignKey(d => d.MaLenh)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTDBTL_Lenh");

            entity.HasOne(d => d.MaTbdbNavigation).WithMany(p => p.CtdongBoTrongLenhs)
                .HasForeignKey(d => d.MaTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTDBTL_TBDB");

            entity.HasOne(d => d.MaTonKhoNavigation).WithMany()
                .HasForeignKey(d => d.MaTonKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTDBTL_TonKho");
        });

        modelBuilder.Entity<CtXuatKho>(entity =>
        {
            entity.HasKey(e => e.MaCtxuatKho);

            entity.ToTable("CTXuatKho");

            entity.Property(e => e.MaCtxuatKho).HasColumnName("maCTXuatKho");
            entity.Property(e => e.MaCtdongBoLenh).HasColumnName("maCTDongBoLenh");
            entity.Property(e => e.MaTonKho).HasColumnName("maTonKho");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");

            entity.HasOne(d => d.MaCtdongBoLenhNavigation).WithMany()
                .HasForeignKey(d => d.MaCtdongBoLenh)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_CTXuatKho_CTDBTL");

            entity.HasOne(d => d.MaTonKhoNavigation).WithMany()
                .HasForeignKey(d => d.MaTonKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CTXuatKho_TonKho");
        });

        modelBuilder.Entity<DinhKhu>(entity =>
        {
            entity.HasKey(e => e.MaDinhKhu).HasName("PK__DinhKhu__A3880290EE99A779");

            entity.ToTable("DinhKhu");

            entity.Property(e => e.MaDinhKhu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maDinhKhu");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(300)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaNhaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maNhaKho");
            entity.Property(e => e.TenDinhKhu)
                .HasMaxLength(200)
                .HasColumnName("tenDinhKhu");

            entity.HasOne(d => d.MaNhaKhoNavigation).WithMany(p => p.DinhKhus)
                .HasForeignKey(d => d.MaNhaKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DinhKhu_NhaKho");
        });

        modelBuilder.Entity<DotKiemKe>(entity =>
        {
            entity.HasKey(e => e.MaDotKiemKe).HasName("PK__DotKiemK__7FA866397C13F0E1");

            entity.ToTable("DotKiemKe");

            entity.Property(e => e.MaDotKiemKe)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maDotKiemKe");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.Nam).HasColumnName("nam");
            entity.Property(e => e.NgayBatDau).HasColumnName("ngayBatDau");
            entity.Property(e => e.NgayKetThuc).HasColumnName("ngayKetThuc");
            entity.Property(e => e.NoiDung)
                .HasMaxLength(1000)
                .HasColumnName("noiDung");
            entity.Property(e => e.TenDotKiemKe)
                .HasMaxLength(200)
                .HasColumnName("tenDotKiemKe");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("trangThai");
        });

        modelBuilder.Entity<Dvt>(entity =>
        {
            entity.HasKey(e => e.MaDvt).HasName("PK__DVT__24304B492D6A3B14");

            entity.ToTable("DVT");

            entity.Property(e => e.MaDvt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maDVT");
            entity.Property(e => e.DonViCoBan)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("donViCoBan");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.HeSoCoBan).HasColumnName("heSoCoBan");
            entity.Property(e => e.TenDvt)
                .HasMaxLength(200)
                .HasColumnName("tenDVT");
        });

        modelBuilder.Entity<GiaHang>(entity =>
        {
            entity.HasKey(e => e.MaGia).HasName("PK__GiaHang__2D8758697ACFFE44");

            entity.ToTable("GiaHang");

            entity.Property(e => e.MaGia)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maGia");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(300)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaKhoi)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhoi");
            entity.Property(e => e.TenGia)
                .HasMaxLength(100)
                .HasColumnName("tenGia");

            entity.HasOne(d => d.MaKhoiNavigation).WithMany(p => p.GiaHangs)
                .HasForeignKey(d => d.MaKhoi)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GiaHang_KhoiHang");
        });

        modelBuilder.Entity<HangSx>(entity =>
        {
            entity.HasKey(e => e.MaHsx).HasName("PK__HangSX__2CC883ED28DF2DA3");

            entity.ToTable("HangSX");

            entity.Property(e => e.MaHsx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maHSX");
            entity.Property(e => e.DiaChi)
                .HasMaxLength(200)
                .HasColumnName("diaChi");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("email");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaNsx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNSX");
            entity.Property(e => e.Sdt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("SDT");
            entity.Property(e => e.TenHsx)
                .HasMaxLength(100)
                .HasColumnName("tenHSX");

            entity.HasOne(d => d.MaNsxNavigation).WithMany(p => p.HangSxes)
                .HasForeignKey(d => d.MaNsx)
                .HasConstraintName("FK_HangSX_NSX");
        });

        modelBuilder.Entity<HinhThucNiemCat>(entity =>
        {
            entity.HasKey(e => e.MaHtnc).HasName("PK__HinhThuc__C6B82D31BC6D980E");

            entity.ToTable("HinhThucNiemCat");

            entity.Property(e => e.MaHtnc)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maHTNC");
            entity.Property(e => e.TenHtnc)
                .HasMaxLength(100)
                .HasColumnName("tenHTNC");
        });

        modelBuilder.Entity<HoSoSpkt>(entity =>
        {
            entity.HasKey(e => e.SoHieu).HasName("PK__HoSoSPKT__4D8C6127FBF97EA2");

            entity.ToTable("HoSoSPKT");

            entity.Property(e => e.SoHieu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("soHieu");
            entity.Property(e => e.CapNhatMoiNhat).HasColumnName("capNhatMoiNhat");
            entity.Property(e => e.DonGia)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("donGia");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(1000)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaCcl).HasColumnName("maCCL");
            entity.Property(e => e.MaDvt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maDVT");
            entity.Property(e => e.MaHinhThucNiemCat)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maHinhThucNiemCat");
            entity.Property(e => e.MaHom)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maHom");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.MaKhoi)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhoi");
            entity.Property(e => e.MaKhu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhu");
            entity.Property(e => e.MaLoaiSpkt)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoaiSPKT");
            entity.Property(e => e.MaNhaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maNhaKho");
            entity.Property(e => e.MaNuocSx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNuocSX");
            entity.Property(e => e.MaTang)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTang");
            entity.Property(e => e.MaTinhTrangBaoGoi)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTinhTrangBaoGoi");
            entity.Property(e => e.MaTrangThaiTb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTrangThaiTB");
            entity.Property(e => e.NamSx).HasColumnName("namSX");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");
            entity.Property(e => e.ThanhTien)
                .HasComputedColumnSql("(isnull([soLuong],(0))*isnull([donGia],(0)))", true)
                .HasColumnType("decimal(29, 2)")
                .HasColumnName("thanhTien");
            entity.Property(e => e.ThoiGianTao)
                .HasDefaultValueSql("(sysdatetime())")
                .HasColumnName("thoiGianTao");
            entity.Property(e => e.ViTri)
                .HasMaxLength(500)
                .HasColumnName("viTri");

            entity.HasOne(d => d.MaCclNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaCcl)
                .HasConstraintName("FK_HSSPKT_CCL");

            entity.HasOne(d => d.MaDvtNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaDvt)
                .HasConstraintName("FK_HSSPKT_DVT");

            entity.HasOne(d => d.MaHinhThucNiemCatNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaHinhThucNiemCat)
                .HasConstraintName("FK_HSSPKT_HTNC");

            entity.HasOne(d => d.MaHomNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaHom)
                .HasConstraintName("FK_HSSPKT_Hom");

            entity.HasOne(d => d.MaKhoNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaKho)
                .HasConstraintName("FK_HSSPKT_Kho");

            entity.HasOne(d => d.MaKhoiNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaKhoi)
                .HasConstraintName("FK_HSSPKT_Khoi");

            entity.HasOne(d => d.MaKhuNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaKhu)
                .HasConstraintName("FK_HSSPKT_DinhKhu");

            entity.HasOne(d => d.MaLoaiSpktNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaLoaiSpkt)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HSSPKT_LoaiSPKT");

            entity.HasOne(d => d.MaNhaKhoNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaNhaKho)
                .HasConstraintName("FK_HSSPKT_NhaKho");

            entity.HasOne(d => d.MaNuocSxNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaNuocSx)
                .HasConstraintName("FK_HSSPKT_NSX");

            entity.HasOne(d => d.MaTangNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaTang)
                .HasConstraintName("FK_HSSPKT_Tang");

            entity.HasOne(d => d.MaTinhTrangBaoGoiNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaTinhTrangBaoGoi)
                .HasConstraintName("FK_HSSPKT_TTBG");

            entity.HasOne(d => d.MaTrangThaiTbNavigation).WithMany(p => p.HoSoSpkts)
                .HasForeignKey(d => d.MaTrangThaiTb)
                .HasConstraintName("FK_HSSPKT_TrangThai");
        });

        modelBuilder.Entity<Hom>(entity =>
        {
            entity.HasKey(e => e.MaHom).HasName("PK__Hom__2CC96FB52A70A903");

            entity.ToTable("Hom");

            entity.Property(e => e.MaHom)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maHom");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(300)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaTang)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTang");

            entity.HasOne(d => d.MaTangNavigation).WithMany(p => p.Homs)
                .HasForeignKey(d => d.MaTang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Hom_Tang");
        });

        modelBuilder.Entity<Httt>(entity =>
        {
            entity.HasKey(e => e.MaHttt).HasName("PK__HTTT__C6B9FF889FE2DD4C");

            entity.ToTable("HTTT");

            entity.Property(e => e.MaHttt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maHTTT");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MucPhi)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("mucPhi");
            entity.Property(e => e.TenHttt)
                .HasMaxLength(100)
                .HasColumnName("tenHTTT");
        });

        modelBuilder.Entity<HtvanChuyen>(entity =>
        {
            entity.HasKey(e => e.MaHtvc).HasName("PK__HTVanChu__C6B9EE3B5518C9DE");

            entity.ToTable("HTVanChuyen");

            entity.Property(e => e.MaHtvc)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maHTVC");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MucPhi)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("mucPhi");
            entity.Property(e => e.TenHtvc)
                .HasMaxLength(100)
                .HasColumnName("tenHTVC");
        });

        modelBuilder.Entity<Kho>(entity =>
        {
            entity.HasKey(e => e.MaKho).HasName("PK__Kho__26DF73D44C7CE97F");

            entity.ToTable("Kho");

            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.DiaChi)
                .HasMaxLength(200)
                .HasColumnName("diaChi");
            entity.Property(e => e.DienTich)
                .HasColumnType("decimal(10, 2)")
                .HasColumnName("dienTich");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaLoaiKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoaiKho");
            entity.Property(e => e.MaTinh)
                .HasMaxLength(5)
                .IsUnicode(false)
                .HasColumnName("maTinh");
            entity.Property(e => e.MaXa)
                .HasMaxLength(6)
                .IsUnicode(false)
                .HasColumnName("maXa");
            entity.Property(e => e.TenKho)
                .HasMaxLength(200)
                .HasColumnName("tenKho");

            entity.HasOne(d => d.MaLoaiKhoNavigation).WithMany(p => p.Khos)
                .HasForeignKey(d => d.MaLoaiKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Kho_LoaiKho");

            entity.HasOne(d => d.MaTinhNavigation).WithMany(p => p.Khos)
                .HasForeignKey(d => d.MaTinh)
                .HasConstraintName("FK_Kho_Tinh");

            entity.HasOne(d => d.MaXaNavigation).WithMany(p => p.Khos)
                .HasForeignKey(d => d.MaXa)
                .HasConstraintName("FK_Kho_Xa");
        });

        modelBuilder.Entity<KhoiHang>(entity =>
        {
            entity.HasKey(e => e.MaKhoi).HasName("PK__KhoiHang__C79B8C2A1AEC0179");

            entity.ToTable("KhoiHang");

            entity.Property(e => e.MaKhoi)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhoi");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(300)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaDinhKhu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maDinhKhu");
            entity.Property(e => e.TenKhoi)
                .HasMaxLength(100)
                .HasColumnName("tenKhoi");

            entity.HasOne(d => d.MaDinhKhuNavigation).WithMany(p => p.KhoiHangs)
                .HasForeignKey(d => d.MaDinhKhu)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_KhoiHang_DinhKhu");
        });

        modelBuilder.Entity<KieuSpkt>(entity =>
        {
            entity.HasKey(e => e.MaKieu).HasName("PK__KieuSPKT__C7DFEB4848B518FA");

            entity.ToTable("KieuSPKT");

            entity.Property(e => e.MaKieu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKieu");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaDvt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maDVT");
            entity.Property(e => e.NuocSx)
                .HasMaxLength(100)
                .HasColumnName("nuocSX");
            entity.Property(e => e.TenKieu)
                .HasMaxLength(200)
                .HasColumnName("tenKieu");

            entity.HasMany(d => d.MaLoaiSpkts).WithMany(p => p.MaKieus)
                .UsingEntity<Dictionary<string, object>>(
                    "LoaiTbthuocKieu",
                    r => r.HasOne<LoaiSpkt>().WithMany()
                        .HasForeignKey("MaLoaiSpkt")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_LTBK_LoaiSPKT"),
                    l => l.HasOne<KieuSpkt>().WithMany()
                        .HasForeignKey("MaKieu")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_LTBK_KieuSPKT"),
                    j =>
                    {
                        j.HasKey("MaKieu", "MaLoaiSpkt");
                        j.ToTable("LoaiTBThuocKieu");
                        j.IndexerProperty<string>("MaKieu")
                            .HasMaxLength(30)
                            .IsUnicode(false)
                            .HasColumnName("maKieu");
                        j.IndexerProperty<string>("MaLoaiSpkt")
                            .HasMaxLength(30)
                            .IsUnicode(false)
                            .HasColumnName("maLoaiSPKT");
                    });
        });

        modelBuilder.Entity<LenhChuyenCap>(entity =>
        {
            entity.HasKey(e => e.MaLenh);

            entity.ToTable("LenhChuyenCap");

            entity.Property(e => e.MaLenh)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLenh");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.NgayLap).HasColumnName("ngayLap");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("trangThai");
            entity.Property(e => e.CanCu).HasMaxLength(400).HasColumnName("canCu");
            entity.Property(e => e.VeViec).HasMaxLength(400).HasColumnName("veViec");
            entity.Property(e => e.NguoiTao)
                .HasMaxLength(100)
                .HasColumnName("nguoiTao");
            entity.Property(e => e.NguoiKetThuc)
                .HasMaxLength(100)
                .HasColumnName("nguoiKetThuc");
            entity.Property(e => e.NgayKetThuc).HasColumnName("ngayKetThuc");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");

            entity.HasOne(d => d.MaKhoNavigation).WithMany()
                .HasForeignKey(d => d.MaKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LenhChuyenCap_Kho");
        });

        modelBuilder.Entity<LenhThayDoiViTri>(entity =>
        {
            entity.HasKey(e => e.MaLenh);

            entity.ToTable("LenhThayDoiViTri");

            entity.Property(e => e.MaLenh)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLenh");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.NgayLap).HasColumnName("ngayLap");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("trangThai");
            entity.Property(e => e.CanCu).HasMaxLength(400).HasColumnName("canCu");
            entity.Property(e => e.VeViec).HasMaxLength(400).HasColumnName("veViec");
            entity.Property(e => e.NguoiTao)
                .HasMaxLength(200)
                .HasColumnName("nguoiTao");
            entity.Property(e => e.NguoiKetThuc)
                .HasMaxLength(200)
                .HasColumnName("nguoiKetThuc");
            entity.Property(e => e.NgayKetThuc).HasColumnName("ngayKetThuc");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(1000)
                .HasColumnName("ghiChu");

            entity.HasOne(d => d.MaKhoNavigation).WithMany()
                .HasForeignKey(d => d.MaKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LenhThayDoiViTri_Kho");
        });

        modelBuilder.Entity<Lenh>(entity =>
        {
            entity.HasKey(e => e.MaLenh).HasName("PK__Lenh__FFB819453F699BFB");

            entity.ToTable("Lenh");

            entity.Property(e => e.MaLenh)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLenh");
            entity.Property(e => e.CanCu)
                .HasMaxLength(200)
                .HasColumnName("canCu");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(1000)
                .HasColumnName("ghiChu");
            entity.Property(e => e.DonViChuyen)
                .HasMaxLength(200)
                .HasColumnName("donViChuyen");
            entity.Property(e => e.GiaTriDenNgay).HasColumnName("giaTriDenNgay");
            entity.Property(e => e.MaHttt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maHTTT");
            entity.Property(e => e.MaKhoNhap)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhoNhap");
            entity.Property(e => e.MaKhoXuat)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhoXuat");
            entity.Property(e => e.MaLenhChiTiet)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maLenhChiTiet");
            entity.Property(e => e.MaLoaiLenh)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maLoaiLenh");
            entity.Property(e => e.MaNcc)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNCC");
            entity.Property(e => e.Ngay).HasColumnName("ngay");
            entity.Property(e => e.NgayHieuLuc).HasColumnName("ngayHieuLuc");
            entity.Property(e => e.NguoiTao)
                .HasMaxLength(200)
                .HasColumnName("nguoiTao");
            entity.Property(e => e.PtVanChuyen)
                .HasMaxLength(100)
                .HasColumnName("ptVanChuyen");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("trangThai");
            entity.Property(e => e.VeViec)
                .HasMaxLength(200)
                .HasColumnName("veViec");

            entity.HasOne(d => d.MaHtttNavigation).WithMany(p => p.Lenhs)
                .HasForeignKey(d => d.MaHttt)
                .HasConstraintName("FK_Lenh_HTTT");

            entity.HasOne(d => d.MaKhoNhapNavigation).WithMany(p => p.LenhMaKhoNhapNavigations)
                .HasForeignKey(d => d.MaKhoNhap)
                .HasConstraintName("FK_Lenh_KhoNhap");

            entity.HasOne(d => d.MaKhoXuatNavigation).WithMany(p => p.LenhMaKhoXuatNavigations)
                .HasForeignKey(d => d.MaKhoXuat)
                .HasConstraintName("FK_Lenh_KhoXuat");

            entity.HasOne(d => d.MaLenhChiTietNavigation).WithMany(p => p.Lenhs)
                .HasForeignKey(d => d.MaLenhChiTiet)
                .HasConstraintName("FK_Lenh_ChiTietTCNX");

            entity.HasOne(d => d.MaLoaiLenhNavigation).WithMany(p => p.Lenhs)
                .HasForeignKey(d => d.MaLoaiLenh)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Lenh_TinhChatNhapXuat");

            entity.HasOne(d => d.MaNccNavigation).WithMany(p => p.Lenhs)
                .HasForeignKey(d => d.MaNcc)
                .HasConstraintName("FK_Lenh_NhaCungCap");
        });

        modelBuilder.Entity<LoTbdb>(entity =>
        {
            entity.HasKey(e => e.MaLoTbdb);

            entity.ToTable("LoTBDB");

            entity.HasIndex(e => e.MaCtdongBoLenh, "UQ_LoTBDB_CTDongBo").IsUnique();

            entity.Property(e => e.MaLoTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoTBDB");
            entity.Property(e => e.CapNhatMoiNhat).HasColumnName("capNhatMoiNhat");
            entity.Property(e => e.DonGia)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("donGia");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaCcl).HasColumnName("maCCL");
            entity.Property(e => e.MaCtdongBoLenh).HasColumnName("maCTDongBoLenh");
            entity.Property(e => e.MaNuocSx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNuocSX");
            entity.Property(e => e.MaTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTBDB");
            entity.Property(e => e.MaTinhTrangBaoGoi)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTinhTrangBaoGoi");
            entity.Property(e => e.MaHinhThucNiemCat)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maHinhThucNiemCat");
            entity.Property(e => e.NamSx).HasColumnName("namSX");
            entity.Property(e => e.SoLuongNhap).HasColumnName("soLuongNhap");
            entity.Property(e => e.ThoiGianTao)
                .HasDefaultValueSql("(sysdatetime())")
                .HasColumnName("thoiGianTao");
            entity.Property(e => e.TrangThaiLo)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("NHAP")
                .HasColumnName("trangThaiLo");

            entity.HasOne(d => d.MaCclNavigation).WithMany(p => p.LoTbdbs)
                .HasForeignKey(d => d.MaCcl)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LoTBDB_CCL");

            entity.HasOne(d => d.MaCtdongBoLenhNavigation).WithOne(p => p.LoTbdb)
                .HasForeignKey<LoTbdb>(d => d.MaCtdongBoLenh)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LoTBDB_CTDongBoLenh");

            entity.HasOne(d => d.MaNuocSxNavigation).WithMany(p => p.LoTbdbs)
                .HasForeignKey(d => d.MaNuocSx)
                .HasConstraintName("FK_LoTBDB_NuocSX");

            entity.HasOne(d => d.MaTbdbNavigation).WithMany(p => p.LoTbdbs)
                .HasForeignKey(d => d.MaTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LoTBDB_TBDB");

            entity.HasOne(d => d.MaTinhTrangBaoGoiNavigation).WithMany(p => p.LoTbdbs)
                .HasForeignKey(d => d.MaTinhTrangBaoGoi)
                .HasConstraintName("FK_LoTBDB_TinhTrangBaoGoi");

            entity.HasOne(d => d.MaHinhThucNiemCatNavigation).WithMany(p => p.LoTbdbs)
                .HasForeignKey(d => d.MaHinhThucNiemCat)
                .HasConstraintName("FK_LoTBDB_HinhThucNiemCat");
        });

        modelBuilder.Entity<LoaiKho>(entity =>
        {
            entity.HasKey(e => e.MaLoaiKho).HasName("PK__LoaiKho__451C930D0E3D599F");

            entity.ToTable("LoaiKho");

            entity.Property(e => e.MaLoaiKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoaiKho");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenLoaiKho)
                .HasMaxLength(100)
                .HasColumnName("tenLoaiKho");
        });

        modelBuilder.Entity<LoaiSpkt>(entity =>
        {
            entity.HasKey(e => e.MaLoai).HasName("PK__LoaiSPKT__E5A6B2284636DD3F");

            entity.ToTable("LoaiSPKT");

            entity.Property(e => e.MaLoai)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoai");
            entity.Property(e => e.Co)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("co");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.KiHieu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("kiHieu");
            entity.Property(e => e.MaDvt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maDVT");
            entity.Property(e => e.MaNhom)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maNhom");
            entity.Property(e => e.NuocSx)
                .HasMaxLength(50)
                .HasColumnName("nuocSX");
            entity.Property(e => e.TenLoai)
                .HasMaxLength(100)
                .HasColumnName("tenLoai");

            entity.HasOne(d => d.MaNhomNavigation).WithMany(p => p.LoaiSpkts)
                .HasForeignKey(d => d.MaNhom)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LoaiSPKT_NhomSPKT");
        });

        modelBuilder.Entity<LoaiTbdb>(entity =>
        {
            entity.HasKey(e => e.MaLoai).HasName("PK__LoaiTBDB__E5A6B22818DB9FBD");

            entity.ToTable("LoaiTBDB");

            entity.Property(e => e.MaLoai)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maLoai");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenLoai)
                .HasMaxLength(100)
                .HasColumnName("tenLoai");
        });

        modelBuilder.Entity<Ncc>(entity =>
        {
            entity.HasKey(e => e.MaNcc).HasName("PK__NCC__2699C45FCFAA2D9E");

            entity.ToTable("NCC");

            entity.Property(e => e.MaNcc)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNCC");
            entity.Property(e => e.DiaChi)
                .HasMaxLength(200)
                .HasColumnName("diaChi");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("email");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaNsx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNSX");
            entity.Property(e => e.Sdt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("SDT");
            entity.Property(e => e.TenNcc)
                .HasMaxLength(100)
                .HasColumnName("tenNCC");

            entity.HasOne(d => d.MaNsxNavigation).WithMany(p => p.Nccs)
                .HasForeignKey(d => d.MaNsx)
                .HasConstraintName("FK_NCC_NSX");
        });

        modelBuilder.Entity<NguoiDung>(entity =>
        {
            entity.HasKey(e => e.MaNd).HasName("PK__NguoiDun__7A3EC7CBBEF084BB");

            entity.ToTable("NguoiDung");

            entity.HasIndex(e => e.TenDangNhap, "UQ__NguoiDun__59267D4A327853F2").IsUnique();

            entity.HasIndex(e => e.Email, "UQ__NguoiDun__AB6E6164EAD21098").IsUnique();

            entity.Property(e => e.MaNd).HasColumnName("maND");
            entity.Property(e => e.AvatarUrl)
                .HasMaxLength(500)
                .IsUnicode(false)
                .HasColumnName("avatarURL");
            entity.Property(e => e.BiKhoa).HasColumnName("biKhoa");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(sysdatetime())")
                .HasColumnName("createdAt");
            entity.Property(e => e.CreatedBy).HasColumnName("createdBy");
            entity.Property(e => e.Email)
                .HasMaxLength(200)
                .IsUnicode(false)
                .HasColumnName("email");
            entity.Property(e => e.HoTen)
                .HasMaxLength(200)
                .HasColumnName("hoTen");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("isActive");
            entity.Property(e => e.LanDangNhapCuoi).HasColumnName("lanDangNhapCuoi");
            entity.Property(e => e.LyDoKhoa)
                .HasMaxLength(500)
                .HasColumnName("lyDoKhoa");
            entity.Property(e => e.MaCapBac)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maCapBac");
            entity.Property(e => e.MaChucVu)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maChucVu");
            entity.Property(e => e.MaDonVi)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maDonVi");
            entity.Property(e => e.MatKhauHash)
                .HasMaxLength(255)
                .IsUnicode(false)
                .HasColumnName("matKhauHash");
            entity.Property(e => e.SoDienThoai)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("soDienThoai");
            entity.Property(e => e.SoLanSaiMk).HasColumnName("soLanSaiMK");
            entity.Property(e => e.TenDangNhap)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("tenDangNhap");
            entity.Property(e => e.UpdatedAt).HasColumnName("updatedAt");
            entity.Property(e => e.UpdatedBy).HasColumnName("updatedBy");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.InverseCreatedByNavigation)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK_ND_CreatedBy");

            entity.HasOne(d => d.MaCapBacNavigation).WithMany(p => p.NguoiDungs)
                .HasForeignKey(d => d.MaCapBac)
                .HasConstraintName("FK_ND_CapBac");

            entity.HasOne(d => d.MaChucVuNavigation).WithMany(p => p.NguoiDungs)
                .HasForeignKey(d => d.MaChucVu)
                .HasConstraintName("FK_ND_ChucVu");

            entity.HasOne(d => d.MaDonViNavigation).WithMany(p => p.NguoiDungs)
                .HasForeignKey(d => d.MaDonVi)
                .HasConstraintName("FK_ND_DonVi");

            entity.HasOne(d => d.UpdatedByNavigation).WithMany(p => p.InverseUpdatedByNavigation)
                .HasForeignKey(d => d.UpdatedBy)
                .HasConstraintName("FK_ND_UpdatedBy");
        });

        modelBuilder.Entity<NguoiDungVaiTro>(entity =>
        {
            entity.HasKey(e => new { e.MaNguoiDung, e.MaVaiTro });

            entity.ToTable("NguoiDungVaiTro");

            entity.Property(e => e.MaNguoiDung).HasColumnName("maNguoiDung");
            entity.Property(e => e.MaVaiTro)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maVaiTro");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.NguoiDungVaiTros)
                .HasForeignKey(d => d.MaNguoiDung)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NDVT_ND");

            entity.HasOne(d => d.MaVaiTroNavigation).WithMany(p => p.NguoiDungVaiTros)
                .HasForeignKey(d => d.MaVaiTro)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NDVT_VT");
        });

        modelBuilder.Entity<NhaKho>(entity =>
        {
            entity.HasKey(e => e.MaNhaKho).HasName("PK__NhaKho__3CBEE0C11C256E2E");

            entity.ToTable("NhaKho");

            entity.Property(e => e.MaNhaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maNhaKho");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.TenNhaKho)
                .HasMaxLength(100)
                .HasColumnName("tenNhaKho");

            entity.HasOne(d => d.MaKhoNavigation).WithMany(p => p.NhaKhos)
                .HasForeignKey(d => d.MaKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhaKho_Kho");
        });

        modelBuilder.Entity<NhatKyHoatDong>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__NhatKyHo__3213E83FA2578CB6");

            entity.ToTable("NhatKyHoatDong");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.DoiTuong)
                .HasMaxLength(100)
                .IsUnicode(false)
                .HasColumnName("doiTuong");
            entity.Property(e => e.DuLieuSau).HasColumnName("duLieuSau");
            entity.Property(e => e.DuLieuTruoc).HasColumnName("duLieuTruoc");
            entity.Property(e => e.HanhDong)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("hanhDong");
            entity.Property(e => e.KetQua)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("ketQua");
            entity.Property(e => e.LyDoThatBai)
                .HasMaxLength(500)
                .HasColumnName("lyDoThatBai");
            entity.Property(e => e.MaDoiTuong)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maDoiTuong");
            entity.Property(e => e.MaNguoiDung).HasColumnName("maNguoiDung");
            entity.Property(e => e.MoTa)
                .HasMaxLength(1000)
                .HasColumnName("moTa");
            entity.Property(e => e.TenDangNhap)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("tenDangNhap");
            entity.Property(e => e.ThoiGian)
                .HasDefaultValueSql("(sysdatetime())")
                .HasColumnName("thoiGian");

            entity.HasOne(d => d.MaNguoiDungNavigation).WithMany(p => p.NhatKyHoatDongs)
                .HasForeignKey(d => d.MaNguoiDung)
                .HasConstraintName("FK_NKHD_ND");
        });

        modelBuilder.Entity<NhomDongBo>(entity =>
        {
            entity.HasKey(e => new { e.MaKieuSpkt, e.MaLoaiTbdb });

            entity.ToTable("NhomDongBo");

            entity.Property(e => e.MaKieuSpkt)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKieuSPKT");
            entity.Property(e => e.MaLoaiTbdb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maLoaiTBDB");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");

            entity.HasOne(d => d.MaKieuSpktNavigation).WithMany(p => p.NhomDongBos)
                .HasForeignKey(d => d.MaKieuSpkt)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NDB_Kieu");

            entity.HasOne(d => d.MaLoaiTbdbNavigation).WithMany(p => p.NhomDongBos)
                .HasForeignKey(d => d.MaLoaiTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NDB_LoaiTBDB");
        });

        modelBuilder.Entity<NhomSpkt>(entity =>
        {
            entity.HasKey(e => e.MaNhom).HasName("PK__NhomSPKT__8316C8AF6F47270E");

            entity.ToTable("NhomSPKT");

            entity.HasIndex(e => e.TenNhom, "UQ_NhomSPKT_tenNhom").IsUnique();

            entity.Property(e => e.MaNhom)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maNhom");
            entity.Property(e => e.MoTa)
                .HasMaxLength(500)
                .HasColumnName("moTa");
            entity.Property(e => e.TenNhom)
                .HasMaxLength(200)
                .HasColumnName("tenNhom");
        });

        modelBuilder.Entity<Nsx>(entity =>
        {
            entity.HasKey(e => e.MaNsx).HasName("PK__NSX__269942743C53AE9F");

            entity.ToTable("NSX");

            entity.Property(e => e.MaNsx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNSX");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenNsx)
                .HasMaxLength(100)
                .HasColumnName("tenNSX");
        });

        modelBuilder.Entity<PhieuKiemKe>(entity =>
        {
            entity.HasKey(e => e.MaPhieuKiemKe).HasName("PK__PhieuKie__0B5EA6B4B9682BD9");

            entity.ToTable("PhieuKiemKe");

            entity.Property(e => e.MaPhieuKiemKe)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maPhieuKiemKe");
            entity.Property(e => e.MaDotKiemKe)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maDotKiemKe");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.NgayKetThuc).HasColumnName("ngayKetThuc");
            entity.Property(e => e.NgayKiemKe).HasColumnName("ngayKiemKe");
            entity.Property(e => e.NgayLap).HasColumnName("ngayLap");
            entity.Property(e => e.NguoiKiemKe)
                .HasMaxLength(100)
                .HasColumnName("nguoiKiemKe");
            entity.Property(e => e.NguoiTao)
                .HasMaxLength(100)
                .HasColumnName("nguoiTao");
            entity.Property(e => e.NhomTb)
                .HasMaxLength(50)
                .HasColumnName("nhomTB");
            entity.Property(e => e.NoiDung)
                .HasMaxLength(500)
                .HasColumnName("noiDung");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(50)
                .HasColumnName("trangThai");

            entity.HasOne(d => d.MaDotKiemKeNavigation).WithMany(p => p.PhieuKiemKes)
                .HasForeignKey(d => d.MaDotKiemKe)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PhieuKK_DotKK");

            entity.HasOne(d => d.MaKhoNavigation).WithMany(p => p.PhieuKiemKes)
                .HasForeignKey(d => d.MaKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PhieuKK_DonVi");
        });

        modelBuilder.Entity<Quyen>(entity =>
        {
            entity.HasKey(e => e.MaQuyen).HasName("PK__Quyen__97001DA313CE1767");

            entity.ToTable("Quyen");

            entity.HasIndex(e => e.TenQuyen, "UQ__Quyen__2302FA4EAEAD9AB4").IsUnique();

            entity.Property(e => e.MaQuyen).HasColumnName("maQuyen");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(100)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenQuyen)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("tenQuyen");
        });

        modelBuilder.Entity<SpkttrongLenh>(entity =>
        {
            entity.HasKey(e => new { e.MaCtlenh, e.SoHieu });

            entity.ToTable("SPKTTrongLenh");

            entity.Property(e => e.MaCtlenh).HasColumnName("maCTLenh");
            entity.Property(e => e.SoHieu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("soHieu");
            entity.Property(e => e.DonGia)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("donGia");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(1000)
                .HasColumnName("ghiChu");
            entity.Property(e => e.HinhThucNiemCat)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("hinhThucNiemCat");
            entity.Property(e => e.MaCcl).HasColumnName("maCCL");
            entity.Property(e => e.MaHom)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maHom");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.MaKhoi)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhoi");
            entity.Property(e => e.MaKhu)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKhu");
            entity.Property(e => e.MaLoaiSpkt)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoaiSPKT");
            entity.Property(e => e.MaNhaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maNhaKho");
            entity.Property(e => e.MaNuocSx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNuocSX");
            entity.Property(e => e.MaTang)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTang");
            entity.Property(e => e.MaTinhTrangBaoGoi)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTinhTrangBaoGoi");
            entity.Property(e => e.MaTrangThaiTb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTrangThaiTB");
            entity.Property(e => e.NamSx).HasColumnName("namSX");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");
            entity.Property(e => e.ThanhTien)
                .HasComputedColumnSql("(isnull([soLuong],(0))*isnull([donGia],(0)))", true)
                .HasColumnType("decimal(29, 2)")
                .HasColumnName("thanhTien");
            entity.Property(e => e.ViTri)
                .HasMaxLength(500)
                .HasColumnName("viTri");

            entity.HasOne(d => d.HinhThucNiemCatNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.HinhThucNiemCat)
                .HasConstraintName("FK_SPKTTL_HTNC");

            entity.HasOne(d => d.MaCclNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.MaCcl)
                .HasConstraintName("FK_SPKTTL_CCL");

            entity.HasOne(d => d.MaCtlenhNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.MaCtlenh)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SPKTTL_CTL");

            entity.HasOne(d => d.MaHomNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.MaHom)
                .HasConstraintName("FK_SPKTTL_Hom");

            entity.HasOne(d => d.MaLoaiSpktNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.MaLoaiSpkt)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SPKTTL_Loai");

            entity.HasOne(d => d.MaNuocSxNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.MaNuocSx)
                .HasConstraintName("FK_SPKTTL_NSX");

            entity.HasOne(d => d.MaTinhTrangBaoGoiNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.MaTinhTrangBaoGoi)
                .HasConstraintName("FK_SPKTTL_TTBG");

            entity.HasOne(d => d.MaTrangThaiTbNavigation).WithMany(p => p.SpkttrongLenhs)
                .HasForeignKey(d => d.MaTrangThaiTb)
                .HasConstraintName("FK_SPKTTL_TrangThai");
        });

        modelBuilder.Entity<Tang>(entity =>
        {
            entity.HasKey(e => e.MaTang).HasName("PK__Tang__2918EFC9676DD786");

            entity.ToTable("Tang");

            entity.HasIndex(e => new { e.MaGia, e.SoTang }, "UQ_Tang_Gia_soTang").IsUnique();

            entity.Property(e => e.MaTang)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTang");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(300)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaGia)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maGia");
            entity.Property(e => e.SoTang).HasColumnName("soTang");

            entity.HasOne(d => d.MaGiaNavigation).WithMany(p => p.Tangs)
                .HasForeignKey(d => d.MaGia)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Tang_GiaHang");
        });

        modelBuilder.Entity<Tbdb>(entity =>
        {
            entity.HasKey(e => e.MaTbdb).HasName("PK__TBDB__40B37F58602CAA84");

            entity.ToTable("TBDB");

            entity.Property(e => e.MaTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTBDB");
            entity.Property(e => e.CapNhatMoiNhat).HasColumnName("capNhatMoiNhat");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(1000)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaDvt)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maDVT");
            entity.Property(e => e.MaLoaiTbdb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maLoaiTBDB");
            entity.Property(e => e.TenTbdb)
                .HasMaxLength(100)
                .HasColumnName("tenTBDB");
            entity.Property(e => e.ThoiGianTao)
                .HasDefaultValueSql("(sysdatetime())")
                .HasColumnName("thoiGianTao");

            entity.HasOne(d => d.MaDvtNavigation).WithMany(p => p.Tbdbs)
                .HasForeignKey(d => d.MaDvt)
                .HasConstraintName("FK_TBDB_DVT");

            entity.HasOne(d => d.MaLoaiTbdbNavigation).WithMany(p => p.Tbdbs)
                .HasForeignKey(d => d.MaLoaiTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TBDB_Loai");
        });

        modelBuilder.Entity<Tinh>(entity =>
        {
            entity.HasKey(e => e.MaTinh).HasName("PK__Tinh__135EFA3888A90BDD");

            entity.ToTable("Tinh");

            entity.Property(e => e.MaTinh)
                .HasMaxLength(5)
                .IsUnicode(false)
                .HasColumnName("maTinh");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenTinh)
                .HasMaxLength(100)
                .HasColumnName("tenTinh");
            entity.Property(e => e.VungMien)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasColumnName("vungMien");
        });

        modelBuilder.Entity<TinhChatNhapXuat>(entity =>
        {
            entity.HasKey(e => e.MaNx).HasName("PK__TinhChat__7A3EC7D7BFDA13A2");

            entity.ToTable("TinhChatNhapXuat");

            entity.Property(e => e.MaNx)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maNX");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.NhomTb)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("nhomTB");
            entity.Property(e => e.TenNx)
                .HasMaxLength(200)
                .HasColumnName("tenNX");
        });

        modelBuilder.Entity<TinhTrangBaoGoi>(entity =>
        {
            entity.HasKey(e => e.MaTtbg).HasName("PK__TinhTran__27FB0C0847F1544B");

            entity.ToTable("TinhTrangBaoGoi");

            entity.Property(e => e.MaTtbg)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTTBG");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenTtbg)
                .HasMaxLength(200)
                .HasColumnName("tenTTBG");
        });

        modelBuilder.Entity<TonDauKy>(entity =>
        {
            entity.HasKey(e => e.MaTonDau).HasName("PK__TonDauKy__C5F7464464DF0632");

            entity.ToTable("TonDauKy");

            entity.Property(e => e.MaTonDau).HasColumnName("maTonDau");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaChuyenKy)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maChuyenKy");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.MaLoaiSpkt)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoaiSPKT");
            entity.Property(e => e.MaTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maTBDB");
            entity.Property(e => e.Nam).HasColumnName("nam");
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("(sysdatetime())")
                .HasColumnName("ngayTao");
            entity.Property(e => e.NguoiTao)
                .HasMaxLength(100)
                .HasColumnName("nguoiTao");
            entity.Property(e => e.NguonTao)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("KHOI_TAO")
                .HasColumnName("nguonTao");
            entity.Property(e => e.NhomTb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("nhomTB");
            entity.Property(e => e.MaCcl).HasColumnName("maCCL");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");

            entity.HasOne(d => d.MaCclNavigation).WithMany(p => p.TonDauKies)
                .HasForeignKey(d => d.MaCcl)
                .HasConstraintName("FK_TonDauKy_CCL");

            entity.HasOne(d => d.MaChuyenKyNavigation).WithMany(p => p.TonDauKies)
                .HasForeignKey(d => d.MaChuyenKy)
                .HasConstraintName("FK_TonDauKy_ChuyenKy");

            entity.HasOne(d => d.MaKhoNavigation).WithMany(p => p.TonDauKies)
                .HasForeignKey(d => d.MaKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TonDauKy_Kho");

            entity.HasOne(d => d.MaLoaiSpktNavigation).WithMany(p => p.TonDauKies)
                .HasForeignKey(d => d.MaLoaiSpkt)
                .HasConstraintName("FK_TonDauKy_LoaiSPKT");

            entity.HasOne(d => d.MaTbdbNavigation).WithMany(p => p.TonDauKies)
                .HasForeignKey(d => d.MaTbdb)
                .HasConstraintName("FK_TonDauKy_TBDB");
        });

        modelBuilder.Entity<TonKhoTbdb>(entity =>
        {
            entity.HasKey(e => e.MaTonKho);

            entity.ToTable("TonKhoTBDB");

            entity.Property(e => e.MaTonKho).HasColumnName("maTonKho");
            entity.Property(e => e.CapNhatMoiNhat)
                .HasDefaultValueSql("(sysdatetime())")
                .HasColumnName("capNhatMoiNhat");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(500)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaKho)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maKho");
            entity.Property(e => e.MaLoTbdb)
                .HasMaxLength(30)
                .IsUnicode(false)
                .HasColumnName("maLoTBDB");
            entity.Property(e => e.MaTrangThaiTb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTrangThaiTB");
            entity.Property(e => e.MoTaViTri)
                .HasMaxLength(300)
                .HasColumnName("moTaViTri");
            entity.Property(e => e.SoLuong).HasColumnName("soLuong");
            entity.Property(e => e.TenDinhKhu)
                .HasMaxLength(100)
                .HasColumnName("tenDinhKhu");
            entity.Property(e => e.TenGia)
                .HasMaxLength(100)
                .HasColumnName("tenGia");
            entity.Property(e => e.TenHom)
                .HasMaxLength(100)
                .HasColumnName("tenHom");
            entity.Property(e => e.TenKhoi)
                .HasMaxLength(100)
                .HasColumnName("tenKhoi");
            entity.Property(e => e.TenNhaKho)
                .HasMaxLength(100)
                .HasColumnName("tenNhaKho");
            entity.Property(e => e.TenTang)
                .HasMaxLength(100)
                .HasColumnName("tenTang");

            entity.HasOne(d => d.MaKhoNavigation).WithMany(p => p.TonKhoTbdbs)
                .HasForeignKey(d => d.MaKho)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TonKhoTBDB_Kho");

            entity.HasOne(d => d.MaLoTbdbNavigation).WithMany(p => p.TonKhoTbdbs)
                .HasForeignKey(d => d.MaLoTbdb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TonKhoTBDB_LoTBDB");

            entity.HasOne(d => d.MaTrangThaiTbNavigation).WithMany(p => p.TonKhoTbdbs)
                .HasForeignKey(d => d.MaTrangThaiTb)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TonKhoTBDB_TrangThai");
        });

        modelBuilder.Entity<TrangThaiTb>(entity =>
        {
            entity.HasKey(e => e.MaTttb).HasName("PK__TrangTha__27FB827886C044A0");

            entity.ToTable("TrangThaiTB");

            entity.Property(e => e.MaTttb)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("maTTTB");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(200)
                .HasColumnName("ghiChu");
            entity.Property(e => e.TenTttb)
                .HasMaxLength(200)
                .HasColumnName("tenTTTB");
        });

        modelBuilder.Entity<VaiTro>(entity =>
        {
            entity.HasKey(e => e.MaVaiTro).HasName("PK__VaiTro__BFC88AB7E0424E35");

            entity.ToTable("VaiTro");

            entity.Property(e => e.MaVaiTro)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maVaiTro");
            entity.Property(e => e.MoTa)
                .HasMaxLength(500)
                .HasColumnName("moTa");
            entity.Property(e => e.TenVaiTro)
                .HasMaxLength(200)
                .HasColumnName("tenVaiTro");
        });

        modelBuilder.Entity<VaiTroChucNangQuyen>(entity =>
        {
            entity.HasKey(e => new { e.MaVaiTro, e.MaQuyen, e.MaCn }).HasName("PK_VTCNQ");

            entity.ToTable("VaiTroChucNangQuyen");

            entity.Property(e => e.MaVaiTro)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maVaiTro");
            entity.Property(e => e.MaQuyen).HasColumnName("maQuyen");
            entity.Property(e => e.MaCn)
                .HasMaxLength(50)
                .IsUnicode(false)
                .HasColumnName("maCN");

            entity.HasOne(d => d.MaCnNavigation).WithMany(p => p.VaiTroChucNangQuyens)
                .HasForeignKey(d => d.MaCn)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_VTCNQ_CN");

            entity.HasOne(d => d.MaQuyenNavigation).WithMany(p => p.VaiTroChucNangQuyens)
                .HasForeignKey(d => d.MaQuyen)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_VTCNQ_Q");

            entity.HasOne(d => d.MaVaiTroNavigation).WithMany(p => p.VaiTroChucNangQuyens)
                .HasForeignKey(d => d.MaVaiTro)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_VTCNQ_VT");
        });

        modelBuilder.Entity<Xa>(entity =>
        {
            entity.HasKey(e => e.MaXa).HasName("PK__Xa__7A2182CF1387215A");

            entity.ToTable("Xa");

            entity.Property(e => e.MaXa)
                .HasMaxLength(6)
                .IsUnicode(false)
                .HasColumnName("maXa");
            entity.Property(e => e.GhiChu)
                .HasMaxLength(150)
                .HasColumnName("ghiChu");
            entity.Property(e => e.MaTinh)
                .HasMaxLength(5)
                .IsUnicode(false)
                .HasColumnName("maTinh");
            entity.Property(e => e.TenXa)
                .HasMaxLength(100)
                .HasColumnName("tenXa");

            entity.HasOne(d => d.MaTinhNavigation).WithMany(p => p.Xas)
                .HasForeignKey(d => d.MaTinh)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Xa_Tinh");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
