using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class NhatKyHoatDong
{
    public long Id { get; set; }

    public int? MaNguoiDung { get; set; }

    public string? TenDangNhap { get; set; }

    public string HanhDong { get; set; } = null!;

    public string? DoiTuong { get; set; }

    public string? MaDoiTuong { get; set; }

    public string? MoTa { get; set; }

    public string? DuLieuTruoc { get; set; }

    public string? DuLieuSau { get; set; }

    public DateTime ThoiGian { get; set; }

    public string KetQua { get; set; } = null!;

    public string? LyDoThatBai { get; set; }

    public virtual NguoiDung? MaNguoiDungNavigation { get; set; }
}
