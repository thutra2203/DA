using System;
using System.Collections.Generic;

namespace backend_dotnet.Models;

public partial class CtxuatKho
{
    public long MaCtxuatKho { get; set; }

    public long MaCtdongBoLenh { get; set; }

    public long MaTonKho { get; set; }

    public int SoLuong { get; set; }

    public virtual CtdongBoTrongLenh MaCtdongBoLenhNavigation { get; set; } = null!;

    public virtual TonKhoTbdb MaTonKhoNavigation { get; set; } = null!;
}
