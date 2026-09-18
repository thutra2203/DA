using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class SpkttrongLenh
{
    public int MaCtlenh { get; set; }

    public string SoHieu { get; set; } = null!;

    public string MaLoaiSpkt { get; set; } = null!;

    public int? NamSx { get; set; }

    public string? MaNuocSx { get; set; }

    public int? MaCcl { get; set; }

    public string? HinhThucNiemCat { get; set; }

    public string? MaTinhTrangBaoGoi { get; set; }

    public string? MaKho { get; set; }

    public string? TenNhaKho { get; set; }

    public string? TenDinhKhu { get; set; }

    public string? TenKhoi { get; set; }

    public string? TenTang { get; set; }

    public string? TenHom { get; set; }

    public string? MaTrangThaiTb { get; set; }

    public string? ViTri { get; set; }

    public int SoLuong { get; set; }

    public decimal? DonGia { get; set; }

    public decimal? ThanhTien { get; set; }

    public string? GhiChu { get; set; }

    public virtual HinhThucNiemCat? HinhThucNiemCatNavigation { get; set; }

    public virtual CapChatLuong? MaCclNavigation { get; set; }

    public virtual ChiTietLenh MaCtlenhNavigation { get; set; } = null!;

    public virtual LoaiSpkt MaLoaiSpktNavigation { get; set; } = null!;

    public virtual Nsx? MaNuocSxNavigation { get; set; }

    public virtual TinhTrangBaoGoi? MaTinhTrangBaoGoiNavigation { get; set; }

    public virtual TrangThaiTb? MaTrangThaiTbNavigation { get; set; }
}
