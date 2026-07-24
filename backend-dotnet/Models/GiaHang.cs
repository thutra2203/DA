using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class GiaHang
{
    public string MaGia { get; set; } = null!;

    public string MaKhoi { get; set; } = null!;

    public string TenGia { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual KhoiHang MaKhoiNavigation { get; set; } = null!;

    public virtual ICollection<Tang> Tangs { get; set; } = new List<Tang>();
}
