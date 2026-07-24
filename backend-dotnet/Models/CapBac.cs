using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class CapBac
{
    public string MaCapBac { get; set; } = null!;

    public string TenCapBac { get; set; } = null!;

    public int? ThuTu { get; set; }

    public virtual ICollection<NguoiDung> NguoiDungs { get; set; } = new List<NguoiDung>();
}
