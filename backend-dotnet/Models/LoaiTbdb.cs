using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class LoaiTbdb
{
    public string MaLoai { get; set; } = null!;

    public string TenLoai { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<ChiTietLenh> ChiTietLenhs { get; set; } = new List<ChiTietLenh>();

    public virtual ICollection<NhomDongBo> NhomDongBos { get; set; } = new List<NhomDongBo>();

    public virtual ICollection<Tbdb> Tbdbs { get; set; } = new List<Tbdb>();
}
