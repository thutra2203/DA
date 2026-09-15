using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class CapChatLuong
{
    public int MaCap { get; set; }

    public string TenCap { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<ChiTietKiemKe> ChiTietKiemKes { get; set; } = new List<ChiTietKiemKe>();

    public virtual ICollection<ChiTietLenhChuyenCap> ChiTietLenhChuyenCapMaCclCuNavigations { get; set; } = new List<ChiTietLenhChuyenCap>();

    public virtual ICollection<ChiTietLenhChuyenCap> ChiTietLenhChuyenCapMaCclMoiNavigations { get; set; } = new List<ChiTietLenhChuyenCap>();

    public virtual ICollection<ChiTietLenh> ChiTietLenhs { get; set; } = new List<ChiTietLenh>();

    public virtual ICollection<CtdongBoTrongLenh> CtdongBoTrongLenhs { get; set; } = new List<CtdongBoTrongLenh>();

    public virtual ICollection<HoSoSpkt> HoSoSpkts { get; set; } = new List<HoSoSpkt>();

    public virtual ICollection<LoTbdb> LoTbdbs { get; set; } = new List<LoTbdb>();

    public virtual ICollection<SpkttrongLenh> SpkttrongLenhs { get; set; } = new List<SpkttrongLenh>();

    public virtual ICollection<TonDauKy> TonDauKies { get; set; } = new List<TonDauKy>();
}
