using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class VaiTroChucNangQuyen
{
    public string MaVaiTro { get; set; } = null!;

    public int MaQuyen { get; set; }

    public string MaCn { get; set; } = null!;

    public virtual ChucNang MaCnNavigation { get; set; } = null!;

    public virtual Quyen MaQuyenNavigation { get; set; } = null!;

    public virtual VaiTro MaVaiTroNavigation { get; set; } = null!;
}
