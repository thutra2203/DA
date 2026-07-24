using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class Lenh
{
    public string MaLenh { get; set; } = null!;

    public string MaLoaiLenh { get; set; } = null!;

    public string? MaLenhChiTiet { get; set; }

    public DateOnly Ngay { get; set; }

    public DateOnly? NgayHieuLuc { get; set; }

    public DateOnly? GiaTriDenNgay { get; set; }

    public string? TrangThai { get; set; }

    public string? CanCu { get; set; }

    public string? VeViec { get; set; }

    public string? MaHttt { get; set; }

    public string? MaKhoNhap { get; set; }

    public string? MaKhoXuat { get; set; }

    public string? PtVanChuyen { get; set; }

    public string? NguoiTao { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<ChiTietLenh> ChiTietLenhs { get; set; } = new List<ChiTietLenh>();

    public virtual Httt? MaHtttNavigation { get; set; }

    public virtual Kho? MaKhoNhapNavigation { get; set; }

    public virtual Kho? MaKhoXuatNavigation { get; set; }

    public virtual ChiTietTcnx? MaLenhChiTietNavigation { get; set; }

    public virtual TinhChatNhapXuat MaLoaiLenhNavigation { get; set; } = null!;
}
