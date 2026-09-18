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

    public virtual ICollection<ChiTietKiemKeViTri> ChiTietKiemKeViTris { get; set; } = new List<ChiTietKiemKeViTri>();

    public virtual ICollection<ChiTietLenhChuyenCap> ChiTietLenhChuyenCaps { get; set; } = new List<ChiTietLenhChuyenCap>();

    public virtual ICollection<ChiTietLenhThayDoiHtnc> ChiTietLenhThayDoiHtncs { get; set; } = new List<ChiTietLenhThayDoiHtnc>();

    public virtual ICollection<ChiTietLenhThayDoiViTri> ChiTietLenhThayDoiViTris { get; set; } = new List<ChiTietLenhThayDoiViTri>();

    public virtual ICollection<CtdongBoTrongLenh> CtdongBoTrongLenhs { get; set; } = new List<CtdongBoTrongLenh>();

    public virtual ICollection<CtxuatKho> CtxuatKhos { get; set; } = new List<CtxuatKho>();

    public virtual Kho MaKhoNavigation { get; set; } = null!;

    public virtual LoTbdb MaLoTbdbNavigation { get; set; } = null!;

    public virtual TrangThaiTb MaTrangThaiTbNavigation { get; set; } = null!;
}
