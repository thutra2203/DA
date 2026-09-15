using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class TrangThaiTb
{
    public string MaTttb { get; set; } = null!;

    public string TenTttb { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual ICollection<ChiTietLenhChuyenCap> ChiTietLenhChuyenCaps { get; set; } = new List<ChiTietLenhChuyenCap>();

    public virtual ICollection<ChiTietLenhThayDoiHtnc> ChiTietLenhThayDoiHtncs { get; set; } = new List<ChiTietLenhThayDoiHtnc>();

    public virtual ICollection<ChiTietLenhThayDoiViTri> ChiTietLenhThayDoiViTris { get; set; } = new List<ChiTietLenhThayDoiViTri>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();

    public virtual ICollection<TonKhoTbdb> TonKhoTbdbs { get; set; } = new List<TonKhoTbdb>();
}
