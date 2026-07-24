using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class ChucVu
{
    public string MaChucVu { get; set; } = null!;

    public string TenChucVu { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<NguoiDung> NguoiDungs { get; set; } = new List<NguoiDung>();
}
