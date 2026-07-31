using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class TonKhoTbdb
{
    public long MaTonKho { get; set; }

    public string MaLoTbdb { get; set; } = null!;

    public string MaKho { get; set; } = null!;

    public string? TenNhaKho { get; set; }

    public string? TenDinhKhu { get; set; }

    public string? TenKhoi { get; set; }

    public string? TenGia { get; set; }

    public string? TenTang { get; set; }

    public string? TenHom { get; set; }

    public string? MoTaViTri { get; set; }

    public string MaTrangThaiTb { get; set; } = null!;

    public int SoLuong { get; set; }

    public string? GhiChu { get; set; }

    public DateTime CapNhatMoiNhat { get; set; }

    public virtual Kho MaKhoNavigation { get; set; } = null!;

    public virtual LoTbdb MaLoTbdbNavigation { get; set; } = null!;

    public virtual TrangThaiTb MaTrangThaiTbNavigation { get; set; } = null!;
}
