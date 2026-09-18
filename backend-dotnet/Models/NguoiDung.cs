using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class NguoiDung
{
    public int MaNd { get; set; }

    public string TenDangNhap { get; set; } = null!;

    public string MatKhauHash { get; set; } = null!;

    public string HoTen { get; set; } = null!;

    public string? MaCapBac { get; set; }

    public string? MaChucVu { get; set; }

    public string? MaDonVi { get; set; }

    public string? Email { get; set; }

    public string? SoDienThoai { get; set; }

    public string? AvatarUrl { get; set; }

    public bool IsActive { get; set; }

    public bool BiKhoa { get; set; }

    public string? LyDoKhoa { get; set; }

    public DateTime? LanDangNhapCuoi { get; set; }

    public int SoLanSaiMk { get; set; }

    public DateTime CreatedAt { get; set; }

    public int? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedBy { get; set; }

    public virtual NguoiDung? CreatedByNavigation { get; set; }

    public virtual ICollection<NguoiDung> InverseCreatedByNavigation { get; set; } = new List<NguoiDung>();

    public virtual ICollection<NguoiDung> InverseUpdatedByNavigation { get; set; } = new List<NguoiDung>();

    public virtual CapBac? MaCapBacNavigation { get; set; }

    public virtual ChucVu? MaChucVuNavigation { get; set; }

    public virtual Kho? MaDonViNavigation { get; set; }

    public virtual ICollection<NguoiDungVaiTro> NguoiDungVaiTros { get; set; } = new List<NguoiDungVaiTro>();

    public virtual ICollection<NhatKyHoatDong> NhatKyHoatDongs { get; set; } = new List<NhatKyHoatDong>();

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public virtual NguoiDung? UpdatedByNavigation { get; set; }
}
