using System.Text.RegularExpressions;
using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;
using Neo4j.Driver;

namespace backend_dotnet.Services.Graph;

public record GraphSyncResult(int SoKho, int SoTbdb, int SoLo, int SoCanhTachTu, int SoCanhLuanChuyen, long ThoiGianMs);

// Dựng lại TOÀN BỘ đồ thị Neo4j từ SQL Server (SQL Server là nguồn sự thật, Neo4j chỉ là bản sao đọc
// phục vụ phần Tổng quan). Cách làm: xoá sạch đồ thị cũ rồi nạp lại — đơn giản, luôn nhất quán, và
// đủ nhanh với quy mô dữ liệu của hệ thống. Gọi từ GraphSyncWorker (định kỳ / lúc khởi động) hoặc
// từ nút "Đồng bộ lại" trên giao diện.
//
// Mô hình đồ thị:
//   (:Kho {maKho, tenKho, tenTinh})
//   (:Tbdb {maTbdb, tenTbdb})
//   (:Lo {maLo, maTbdb, maCcl, trangThai, namSx, tongTon})
//   (:Lo)-[:THUOC_TB]->(:Tbdb)
//   (:Lo)-[:O_KHO {soLuong}]->(:Kho)
//   (:Lo)-[:TACH_TU {lyDo}]->(:Lo)          // lô con -> lô gốc, suy ra từ LoTbdb.GhiChu
//   (:Kho)-[:LUAN_CHUYEN {soLuot, tongSl}]->(:Kho)   // suy ra từ Lenh có cả kho xuất lẫn kho nhập
public class GraphSyncService(
    QuanLyKhoQuanKhiContext db,
    IDriver driver,
    Neo4jOptions options,
    ILogger<GraphSyncService> logger)
{
    // Cả lệnh chuyển cấp và lệnh thay đổi HTNC khi tách một phần đều ghi cùng mẫu:
    //   Tách từ lô "MALOGOC" do chuyển cấp chất lượng
    //   Tách từ lô "MALOGOC" do thay đổi hình thức niêm cất
    private static readonly Regex TachTuRegex =
        new(@"Tách từ lô ""([^""]+)""(?:\s+do\s+(.+?))?\s*$", RegexOptions.Compiled);

    private static readonly string[] Constraints =
    [
        "CREATE CONSTRAINT kho_key IF NOT EXISTS FOR (k:Kho) REQUIRE k.maKho IS UNIQUE",
        "CREATE CONSTRAINT tb_key  IF NOT EXISTS FOR (t:Tbdb) REQUIRE t.maTbdb IS UNIQUE",
        "CREATE CONSTRAINT lo_key  IF NOT EXISTS FOR (l:Lo) REQUIRE l.maLo IS UNIQUE",
    ];

    // ghiLogThongTin: true (khởi động / bấm "Đồng bộ lại") ghi log mức Information; false (đồng bộ
    // định kỳ) hạ xuống Debug để không làm nhiễu console.
    public async Task<GraphSyncResult> DongBoToanBoAsync(CancellationToken ct = default, bool ghiLogThongTin = true)
    {
        var batDau = DateTime.UtcNow;

        // ===== 1. Rút dữ liệu từ SQL Server =====
        // (Không dựng Dictionary ngay trong .Select của EF — expression tree không cho phép;
        //  lấy anonymous type rồi ánh xạ sang Dictionary trong bộ nhớ ở bước 2.)
        var khoRaw = await db.Khos.AsNoTracking()
            .Select(k => new
            {
                k.MaKho,
                k.TenKho,
                TenTinh = k.MaTinhNavigation != null ? k.MaTinhNavigation.TenTinh : null,
                k.DiaChi,
                k.DienTich,
                TenLoaiKho = k.MaLoaiKhoNavigation.TenLoaiKho,
            })
            .ToListAsync(ct);

        var tbRaw = await db.Tbdbs.AsNoTracking()
            .Select(t => new { t.MaTbdb, t.TenTbdb })
            .ToListAsync(ct);

        var loRaw = await db.LoTbdbs.AsNoTracking()
            .Select(l => new
            {
                l.MaLoTbdb, l.MaTbdb, l.MaCcl, l.TrangThaiLo, l.NamSx, l.GhiChu,
                TenCcl = l.MaCclNavigation.TenCap,
            })
            .ToListAsync(ct);

        var tonTheoLoKho = await db.TonKhoTbdbs.AsNoTracking()
            .Where(t => t.SoLuong > 0)
            .GroupBy(t => new { t.MaLoTbdb, t.MaKho })
            .Select(g => new { g.Key.MaLoTbdb, g.Key.MaKho, SoLuong = g.Sum(x => x.SoLuong) })
            .ToListAsync(ct);

        var luanChuyenRaw = await db.Lenhs.AsNoTracking()
            .Where(l => l.MaKhoXuat != null && l.MaKhoNhap != null && l.MaKhoXuat != l.MaKhoNhap)
            .GroupBy(l => new { l.MaKhoXuat, l.MaKhoNhap })
            .Select(g => new { g.Key.MaKhoXuat, g.Key.MaKhoNhap, SoLuot = g.Count() })
            .ToListAsync(ct);

        var luanChuyenSl = await db.CtdongBoTrongLenhs.AsNoTracking()
            .Where(c => c.MaLenhNavigation.MaKhoXuat != null && c.MaLenhNavigation.MaKhoNhap != null
                        && c.MaLenhNavigation.MaKhoXuat != c.MaLenhNavigation.MaKhoNhap)
            .GroupBy(c => new { c.MaLenhNavigation.MaKhoXuat, c.MaLenhNavigation.MaKhoNhap })
            .Select(g => new { g.Key.MaKhoXuat, g.Key.MaKhoNhap, Tong = g.Sum(x => (int?)x.SoLuongThuc) ?? 0 })
            .ToListAsync(ct);

        // ===== 2. Chuẩn hoá thành payload cho Cypher (LINQ-to-objects — Dictionary hợp lệ ở đây) =====
        var maLoTonTai = loRaw.Select(l => l.MaLoTbdb).ToHashSet();

        var tonTheoLo = tonTheoLoKho.GroupBy(x => x.MaLoTbdb)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.SoLuong));

        var khoRows = khoRaw.Select(k => new Dictionary<string, object?>
        {
            ["maKho"] = k.MaKho,
            ["tenKho"] = k.TenKho,
            ["tenTinh"] = k.TenTinh,
            ["diaChi"] = k.DiaChi,
            ["dienTich"] = k.DienTich.HasValue ? (double)k.DienTich.Value : null,
            ["tenLoaiKho"] = k.TenLoaiKho,
        }).ToList();

        var tbRows = tbRaw.Select(t => new Dictionary<string, object?>
        {
            ["maTbdb"] = t.MaTbdb,
            ["tenTbdb"] = t.TenTbdb,
        }).ToList();

        var loRows = loRaw.Select(l => new Dictionary<string, object?>
        {
            ["maLo"] = l.MaLoTbdb,
            ["maTbdb"] = l.MaTbdb,
            ["maCcl"] = l.MaCcl,
            ["tenCcl"] = l.TenCcl,
            ["trangThai"] = l.TrangThaiLo,
            ["namSx"] = l.NamSx,
            ["tongTon"] = tonTheoLo.GetValueOrDefault(l.MaLoTbdb, 0),
        }).ToList();

        var thuocTbRows = loRaw.Select(l => new Dictionary<string, object?>
        {
            ["maLo"] = l.MaLoTbdb,
            ["maTbdb"] = l.MaTbdb,
        }).ToList();

        var oKhoRows = tonTheoLoKho.Select(x => new Dictionary<string, object?>
        {
            ["maLo"] = x.MaLoTbdb,
            ["maKho"] = x.MaKho,
            ["soLuong"] = x.SoLuong,
        }).ToList();

        var tachTuRows = new List<Dictionary<string, object?>>();
        foreach (var l in loRaw)
        {
            if (string.IsNullOrWhiteSpace(l.GhiChu)) continue;
            var m = TachTuRegex.Match(l.GhiChu);
            if (!m.Success) continue;
            var maLoGoc = m.Groups[1].Value;
            if (maLoGoc == l.MaLoTbdb || !maLoTonTai.Contains(maLoGoc)) continue;
            tachTuRows.Add(new Dictionary<string, object?>
            {
                ["maLo"] = l.MaLoTbdb,
                ["maLoGoc"] = maLoGoc,
                ["lyDo"] = m.Groups[2].Success ? m.Groups[2].Value.Trim() : "tách lô",
            });
        }

        var slMap = luanChuyenSl.ToDictionary(x => (x.MaKhoXuat, x.MaKhoNhap), x => x.Tong);
        var luanChuyenRows = luanChuyenRaw.Select(x => new Dictionary<string, object?>
        {
            ["khoXuat"] = x.MaKhoXuat,
            ["khoNhap"] = x.MaKhoNhap,
            ["soLuot"] = x.SoLuot,
            ["tongSl"] = slMap.GetValueOrDefault((x.MaKhoXuat, x.MaKhoNhap), 0),
        }).ToList();

        // ===== 3. Ghi vào Neo4j =====
        await using var session = driver.AsyncSession(o => o.WithDatabase(options.Database));

        foreach (var c in Constraints)
            await (await session.RunAsync(c)).ConsumeAsync();

        await session.ExecuteWriteAsync(async tx =>
        {
            await (await tx.RunAsync("MATCH (n) DETACH DELETE n")).ConsumeAsync();

            await (await tx.RunAsync(
                """
                UNWIND $rows AS r
                MERGE (k:Kho {maKho: r.maKho})
                SET k.tenKho = r.tenKho, k.tenTinh = r.tenTinh, k.diaChi = r.diaChi,
                    k.dienTich = r.dienTich, k.tenLoaiKho = r.tenLoaiKho
                """, new { rows = khoRows })).ConsumeAsync();

            await (await tx.RunAsync(
                "UNWIND $rows AS r MERGE (t:Tbdb {maTbdb: r.maTbdb}) SET t.tenTbdb = r.tenTbdb",
                new { rows = tbRows })).ConsumeAsync();

            await (await tx.RunAsync(
                """
                UNWIND $rows AS r
                MERGE (l:Lo {maLo: r.maLo})
                SET l.maTbdb = r.maTbdb, l.maCcl = r.maCcl, l.tenCcl = r.tenCcl, l.trangThai = r.trangThai,
                    l.namSx = r.namSx, l.tongTon = r.tongTon
                """, new { rows = loRows })).ConsumeAsync();

            await (await tx.RunAsync(
                """
                UNWIND $rows AS r
                MATCH (l:Lo {maLo: r.maLo}), (t:Tbdb {maTbdb: r.maTbdb})
                MERGE (l)-[:THUOC_TB]->(t)
                """, new { rows = thuocTbRows })).ConsumeAsync();

            await (await tx.RunAsync(
                """
                UNWIND $rows AS r
                MATCH (l:Lo {maLo: r.maLo}), (k:Kho {maKho: r.maKho})
                MERGE (l)-[rel:O_KHO]->(k)
                SET rel.soLuong = r.soLuong
                """, new { rows = oKhoRows })).ConsumeAsync();

            if (tachTuRows.Count > 0)
                await (await tx.RunAsync(
                    """
                    UNWIND $rows AS r
                    MATCH (c:Lo {maLo: r.maLo}), (p:Lo {maLo: r.maLoGoc})
                    MERGE (c)-[rel:TACH_TU]->(p)
                    SET rel.lyDo = r.lyDo
                    """, new { rows = tachTuRows })).ConsumeAsync();

            if (luanChuyenRows.Count > 0)
                await (await tx.RunAsync(
                    """
                    UNWIND $rows AS r
                    MATCH (a:Kho {maKho: r.khoXuat}), (b:Kho {maKho: r.khoNhap})
                    MERGE (a)-[rel:LUAN_CHUYEN]->(b)
                    SET rel.soLuot = r.soLuot, rel.tongSl = r.tongSl
                    """, new { rows = luanChuyenRows })).ConsumeAsync();
        });

        var ketQua = new GraphSyncResult(
            khoRows.Count, tbRows.Count, loRows.Count, tachTuRows.Count, luanChuyenRows.Count,
            (long)(DateTime.UtcNow - batDau).TotalMilliseconds);
        logger.Log(ghiLogThongTin ? LogLevel.Information : LogLevel.Debug, "Đồng bộ Neo4j xong: {@KetQua}", ketQua);
        return ketQua;
    }
}
