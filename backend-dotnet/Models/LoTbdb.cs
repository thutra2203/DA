using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class LoTbdb
{
    public string MaLoTbdb { get; set; } = null!;

    public string MaTbdb { get; set; } = null!;

    public long MaCtdongBoLenh { get; set; }

    public int MaCcl { get; set; }

    public int? NamSx { get; set; }

    public string? MaNuocSx { get; set; }

    public string? MaTinhTrangBaoGoi { get; set; }

    public string? MaHinhThucNiemCat { get; set; }

    public decimal DonGia { get; set; }

    public int SoLuongNhap { get; set; }

    public string TrangThaiLo { get; set; } = null!;

    public string? GhiChu { get; set; }

    public DateTime ThoiGianTao { get; set; }

    public DateTime? CapNhatMoiNhat { get; set; }

    public virtual CapChatLuong MaCclNavigation { get; set; } = null!;

    public virtual CtdongBoTrongLenh MaCtdongBoLenhNavigation { get; set; } = null!;

    public virtual Nsx? MaNuocSxNavigation { get; set; }

    public virtual Tbdb MaTbdbNavigation { get; set; } = null!;

    public virtual TinhTrangBaoGoi? MaTinhTrangBaoGoiNavigation { get; set; }

    public virtual HinhThucNiemCat? MaHinhThucNiemCatNavigation { get; set; }

    public virtual ICollection<ChiTietKiemKeViTri> ChiTietKiemKeViTris { get; set; } = new List<ChiTietKiemKeViTri>();

    public virtual ICollection<TonKhoTbdb> TonKhoTbdbs { get; set; } = new List<TonKhoTbdb>();
}
