using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class CtdongBoTrongLenh
{
    public int MaCtlenh { get; set; }

    public string MaTbdb { get; set; } = null!;

    public string MaLoaiTb { get; set; } = null!;

    public int? NamSx { get; set; }

    public string? MaNuocSx { get; set; }

    public int? MaCcl { get; set; }

    public string? HinhThucNiemCat { get; set; }

    public string? MaTinhTrangBaoGoi { get; set; }

    public string? MaKho { get; set; }

    public string? MaNhaKho { get; set; }

    public string? MaKhu { get; set; }

    public string? MaKhoi { get; set; }

    public string? MaTang { get; set; }

    public string? MaHom { get; set; }

    public string? MaTrangThaiTb { get; set; }

    public string? ViTri { get; set; }

    public int SoLuong { get; set; }

    public int? SoLuongThuc { get; set; }

    public decimal? DonGia { get; set; }

    public decimal? ThanhTien { get; set; }

    public string? GhiChu { get; set; }

    public virtual HinhThucNiemCat? HinhThucNiemCatNavigation { get; set; }

    public virtual CapChatLuong? MaCclNavigation { get; set; }

    public virtual ChiTietLenh MaCtlenhNavigation { get; set; } = null!;

    public virtual Hom? MaHomNavigation { get; set; }

    public virtual Nsx? MaNuocSxNavigation { get; set; }

    public virtual Tbdb MaTbdbNavigation { get; set; } = null!;

    public virtual TinhTrangBaoGoi? MaTinhTrangBaoGoiNavigation { get; set; }

    public virtual TrangThaiTb? MaTrangThaiTbNavigation { get; set; }
}
