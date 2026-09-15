using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietLenhThayDoiViTri
{
    public int MaCtlenhThayDoiViTri { get; set; }

    public string MaLenh { get; set; } = null!;

    public long MaTonKho { get; set; }

    public string MaLoTbdb { get; set; } = null!;

    public int SoLuong { get; set; }

    public string? TenNhaKhoMoi { get; set; }

    public string? TenDinhKhuMoi { get; set; }

    public string? TenKhoiMoi { get; set; }

    public string? TenGiaMoi { get; set; }

    public string? TenTangMoi { get; set; }

    public string? TenHomMoi { get; set; }

    public string? MoTaViTriMoi { get; set; }

    public string? GhiChu { get; set; }

    public string? TrangThaiGoc { get; set; }

    public virtual LenhThayDoiViTri MaLenhNavigation { get; set; } = null!;

    public virtual LoTbdb MaLoTbdbNavigation { get; set; } = null!;

    public virtual TonKhoTbdb MaTonKhoNavigation { get; set; } = null!;

    public virtual TrangThaiTb? TrangThaiGocNavigation { get; set; }
}
