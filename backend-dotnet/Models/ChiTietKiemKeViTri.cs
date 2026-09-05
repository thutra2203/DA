using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChiTietKiemKeViTri
{
    public int MaCtkiemKeViTri { get; set; }

    public int MaCtkiemKe { get; set; }

    public string? MaLoTbdb { get; set; }

    public long? MaTonKho { get; set; }

    public string? TenNhaKho { get; set; }

    public string? TenDinhKhu { get; set; }

    public string? TenKhoi { get; set; }

    public string? TenGia { get; set; }

    public string? TenTang { get; set; }

    public string? TenHom { get; set; }

    public string? MoTaViTri { get; set; }

    public int SoLuongSoSach { get; set; }

    public int SoLuongThucTe { get; set; }

    public int? Thua { get; set; }

    public int? Thieu { get; set; }

    public string? GhiChu { get; set; }

    public virtual ChiTietKiemKe MaCtkiemKeNavigation { get; set; } = null!;

    public virtual LoTbdb? MaLoTbdbNavigation { get; set; }

    public virtual TonKhoTbdb? MaTonKhoNavigation { get; set; }
}
