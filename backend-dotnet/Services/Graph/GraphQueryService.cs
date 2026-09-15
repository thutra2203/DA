using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;
using Neo4j.Driver;

namespace backend_dotnet.Services.Graph;

// Các truy vấn ĐỌC đồ thị phục vụ phần Tổng quan và trang "Dòng đời lô".
// Mọi phương thức bắt lỗi kết nối Neo4j và ném GraphUnavailableException để controller trả 503 mềm.
public class GraphQueryService(IDriver driver, Neo4jOptions options, QuanLyKhoQuanKhiContext db)
{
    private async Task<T> DocAsync<T>(Func<IAsyncQueryRunner, Task<T>> work)
    {
        if (!options.Enabled)
            throw new GraphUnavailableException("Tính năng đồ thị (Neo4j) đang tắt trong cấu hình.");
        try
        {
            await using var session = driver.AsyncSession(o => o.WithDatabase(options.Database));
            return await session.ExecuteReadAsync(work);
        }
        catch (Neo4jException ex)
        {
            throw new GraphUnavailableException("Không truy vấn được Neo4j: " + ex.Message, ex);
        }
        catch (Exception ex) when (ex is not GraphUnavailableException)
        {
            throw new GraphUnavailableException("Không kết nối được Neo4j. Hãy chạy \"docker compose up -d\".", ex);
        }
    }

    // ===== Tổng quan: KPI + mạng luân chuyển thu gọn =====
    public Task<object> TongQuanAsync() => DocAsync<object>(async tx =>
    {
        var kpi = await (await tx.RunAsync(
            "RETURN COUNT { (:Lo) } AS tongLo, COUNT { (:Kho) } AS soKho, COUNT { (:Tbdb) } AS soTbdb"
            )).SingleAsync();

        // "Lệnh đang thực hiện" = chưa kết thúc, gộp các loại nghiệp vụ có trạng thái rõ ràng.
        // (EF tự sinh SQL "<> 'HOAN_THANH' OR IS NULL" nên trạng thái null cũng được tính.)
        var soLenhDangThucHien =
            await db.Lenhs.CountAsync(l => l.TrangThai != "HOAN_THANH")
            + await db.LenhChuyenCaps.CountAsync(l => l.TrangThai != "HOAN_THANH")
            + await db.LenhThayDoiViTris.CountAsync(l => l.TrangThai != "HOAN_THANH")
            + await db.LenhThayDoiHtncs.CountAsync(l => l.TrangThai != "HOAN_THANH");

        var khoTrungTam = await (await tx.RunAsync(
            """
            MATCH (k:Kho)
            OPTIONAL MATCH (k)-[r:LUAN_CHUYEN]-(:Kho)
            WITH k, count(r) AS soKetNoi
            RETURN k.maKho AS maKho, k.tenKho AS tenKho, soKetNoi
            ORDER BY soKetNoi DESC LIMIT 1
            """)).ToListAsync();

        var canh = await (await tx.RunAsync(
            """
            MATCH (a:Kho)-[r:LUAN_CHUYEN]->(b:Kho)
            RETURN a.maKho AS tu, a.tenKho AS tuTen, b.maKho AS den, b.tenKho AS denTen,
                   r.soLuot AS soLuot, r.tongSl AS tongSl
            """)).ToListAsync();

        var nodeIds = new HashSet<string>();
        var edges = canh.Select(r =>
        {
            nodeIds.Add(r["tu"].As<string>());
            nodeIds.Add(r["den"].As<string>());
            return new
            {
                from = r["tu"].As<string>(),
                to = r["den"].As<string>(),
                soLuot = r["soLuot"].As<int?>() ?? 0,
                tongSl = r["tongSl"].As<int?>() ?? 0,
            };
        }).ToList();
        var tenKhoMap = new Dictionary<string, string>();
        foreach (var r in canh)
        {
            tenKhoMap[r["tu"].As<string>()] = r["tuTen"].As<string>();
            tenKhoMap[r["den"].As<string>()] = r["denTen"].As<string>();
        }

        return new
        {
            available = true,
            tongLo = kpi["tongLo"].As<int>(),
            soKho = kpi["soKho"].As<int>(),
            soTbdb = kpi["soTbdb"].As<int>(),
            soLenhDangThucHien,
            khoTrungTam = khoTrungTam.Count == 0 || (khoTrungTam[0]["soKetNoi"].As<int?>() ?? 0) == 0 ? null : new
            {
                maKho = khoTrungTam[0]["maKho"].As<string>(),
                tenKho = khoTrungTam[0]["tenKho"].As<string>(),
                soKetNoi = khoTrungTam[0]["soKetNoi"].As<int>(),
            },
            mangLuanChuyen = new
            {
                nodes = nodeIds.Select(id => new { id, label = tenKhoMap.GetValueOrDefault(id, id) }),
                edges,
            },
        };
    });

    // ===== Mạng luân chuyển giữa kho (đầy đủ) =====
    public Task<object> LuanChuyenKhoAsync() => DocAsync<object>(async tx =>
    {
        var nodes = await (await tx.RunAsync(
            """
            MATCH (k:Kho)
            OPTIONAL MATCH (k)<-[:O_KHO]-(l:Lo)
            RETURN k.maKho AS id, k.tenKho AS label, k.tenTinh AS tinh, count(l) AS soLo
            ORDER BY soLo DESC
            """)).ToListAsync();

        var edges = await (await tx.RunAsync(
            """
            MATCH (a:Kho)-[r:LUAN_CHUYEN]->(b:Kho)
            RETURN a.maKho AS from, b.maKho AS to, r.soLuot AS soLuot, r.tongSl AS tongSl
            """)).ToListAsync();

        return new
        {
            available = true,
            nodes = nodes.Select(r => new
            {
                id = r["id"].As<string>(),
                label = r["label"].As<string>(),
                tinh = r["tinh"].As<string?>(),
                soLo = r["soLo"].As<int>(),
            }),
            edges = edges.Select(r => new
            {
                from = r["from"].As<string>(),
                to = r["to"].As<string>(),
                soLuot = r["soLuot"].As<int?>() ?? 0,
                tongSl = r["tongSl"].As<int?>() ?? 0,
            }),
        };
    });

    // ===== Thực lực 1 kho: thông tin kho + trang bị hiện có, phân rã theo trang bị và cấp chất lượng =====
    public Task<object> KhoThucLucAsync(string maKho) => DocAsync<object>(async tx =>
    {
        var rows = await (await tx.RunAsync(
            """
            MATCH (k:Kho {maKho: $maKho})
            OPTIONAL MATCH (k)<-[o:O_KHO]-(l:Lo)-[:THUOC_TB]->(t:Tbdb)
            WITH k, t.maTbdb AS maTb, t.tenTbdb AS tenTb, l.maCcl AS maCcl, l.tenCcl AS tenCcl,
                 sum(o.soLuong) AS soLuong, count(DISTINCT l.maLo) AS soLo
            WITH k, maTb, tenTb,
                 sum(soLuong) AS slTb, sum(soLo) AS soLoTb,
                 collect(CASE WHEN maCcl IS NULL THEN NULL
                              ELSE {maCcl: maCcl, tenCcl: tenCcl, soLuong: soLuong} END) AS theoCap
            WITH k, collect(CASE WHEN maTb IS NULL THEN NULL
                                 ELSE {maTb: maTb, tenTb: tenTb, soLuong: slTb, soLo: soLoTb, theoCap: theoCap} END) AS theoTrangBi
            RETURN k {.maKho, .tenKho, .tenTinh, .diaChi, .dienTich, .tenLoaiKho} AS kho, theoTrangBi
            """, new { maKho })).ToListAsync();

        if (rows.Count == 0)
            throw new GraphUnavailableException($"Không tìm thấy kho \"{maKho}\" trong đồ thị (có thể cần đồng bộ lại).");

        var r = rows[0];
        var khoMap = r["kho"].As<Dictionary<string, object>>();

        var theoTrangBi = r["theoTrangBi"].As<List<object>>()
            .OfType<IReadOnlyDictionary<string, object>>()
            .Select(d => new
            {
                maTb = d["maTb"]?.ToString(),
                tenTb = d["tenTb"]?.ToString(),
                soLuong = ToInt(d["soLuong"]),
                soLo = ToInt(d["soLo"]),
                theoCap = ((IEnumerable<object>)d["theoCap"])
                    .OfType<IReadOnlyDictionary<string, object>>()
                    .Select(c => new
                    {
                        maCcl = c["maCcl"] is null ? (int?)null : ToInt(c["maCcl"]),
                        tenCcl = c["tenCcl"]?.ToString(),
                        soLuong = ToInt(c["soLuong"]),
                    })
                    .OrderBy(c => c.maCcl)
                    .ToList(),
            })
            .OrderByDescending(x => x.soLuong)
            .ToList();

        return new
        {
            available = true,
            kho = new
            {
                maKho = khoMap["maKho"]?.ToString(),
                tenKho = khoMap.GetValueOrDefault("tenKho")?.ToString(),
                tenTinh = khoMap.GetValueOrDefault("tenTinh")?.ToString(),
                diaChi = khoMap.GetValueOrDefault("diaChi")?.ToString(),
                tenLoaiKho = khoMap.GetValueOrDefault("tenLoaiKho")?.ToString(),
                dienTich = khoMap.GetValueOrDefault("dienTich") is { } dt ? Convert.ToDouble(dt) : (double?)null,
            },
            tongSoLuong = theoTrangBi.Sum(x => x.soLuong),
            tongSoLo = theoTrangBi.Sum(x => x.soLo),
            soLoaiTb = theoTrangBi.Count,
            theoTrangBi,
        };
    });

    private static int ToInt(object? v) => v is null ? 0 : Convert.ToInt32(v);

    // ===== Tìm lô để tra dòng đời =====
    public Task<object> TimLoAsync(string? q) => DocAsync<object>(async tx =>
    {
        var rows = await (await tx.RunAsync(
            """
            MATCH (l:Lo)
            WHERE $q = '' OR toLower(l.maLo) CONTAINS toLower($q)
            OPTIONAL MATCH (l)-[:THUOC_TB]->(t:Tbdb)
            WITH l, t,
                 COUNT { (l)-[:TACH_TU]->() } AS coGoc,
                 COUNT { (l)<-[:TACH_TU]-() } AS soConTach
            RETURN l.maLo AS maLo, l.trangThai AS trangThai, l.tongTon AS tongTon,
                   t.tenTbdb AS tenTb, coGoc, soConTach
            ORDER BY soConTach DESC, maLo
            LIMIT 50
            """, new { q = (q ?? string.Empty).Trim() })).ToListAsync();

        return new
        {
            available = true,
            danhSach = rows.Select(r => new
            {
                maLo = r["maLo"].As<string>(),
                trangThai = r["trangThai"].As<string?>(),
                tongTon = r["tongTon"].As<int?>() ?? 0,
                tenTb = r["tenTb"].As<string?>(),
                coGoc = (r["coGoc"].As<int?>() ?? 0) > 0,
                soConTach = r["soConTach"].As<int?>() ?? 0,
            }),
        };
    });

    // ===== Dòng đời 1 lô: cả tổ tiên lẫn hậu duệ =====
    public Task<object> DongDoiLoAsync(string maLo) => DocAsync<object>(async tx =>
    {
        var tonTai = await (await tx.RunAsync(
            "MATCH (l:Lo {maLo: $maLo}) RETURN count(l) AS c", new { maLo })).SingleAsync();
        if (tonTai["c"].As<int>() == 0)
            throw new GraphUnavailableException($"Không tìm thấy lô \"{maLo}\" trong đồ thị (có thể cần đồng bộ lại).");

        var nodeRows = await (await tx.RunAsync(
            """
            MATCH (start:Lo {maLo: $maLo})
            OPTIONAL MATCH (start)-[:TACH_TU*0..12]-(other:Lo)
            WITH start, collect(DISTINCT other) AS others
            UNWIND (others + [start]) AS n
            WITH DISTINCT n WHERE n IS NOT NULL
            OPTIONAL MATCH (n)-[:THUOC_TB]->(t:Tbdb)
            OPTIONAL MATCH (n)-[o:O_KHO]->(k:Kho)
            RETURN n.maLo AS maLo, n.trangThai AS trangThai, n.maCcl AS maCcl, n.tongTon AS tongTon,
                   n.namSx AS namSx, t.maTbdb AS maTb, t.tenTbdb AS tenTb,
                   collect(CASE WHEN k IS NULL THEN NULL
                                ELSE {maKho: k.maKho, tenKho: k.tenKho, soLuong: o.soLuong} END) AS viTriKho
            """, new { maLo })).ToListAsync();

        var maLos = nodeRows.Select(r => r["maLo"].As<string>()).ToList();

        var edgeRows = await (await tx.RunAsync(
            """
            UNWIND $maLos AS m
            MATCH (c:Lo {maLo: m})-[r:TACH_TU]->(p:Lo)
            WHERE p.maLo IN $maLos
            RETURN DISTINCT c.maLo AS child, p.maLo AS parent, r.lyDo AS lyDo
            """, new { maLos })).ToListAsync();

        return new
        {
            available = true,
            goc = maLo,
            nodes = nodeRows.Select(r => new
            {
                maLo = r["maLo"].As<string>(),
                trangThai = r["trangThai"].As<string?>(),
                maCcl = r["maCcl"].As<int?>(),
                namSx = r["namSx"].As<int?>(),
                tongTon = r["tongTon"].As<int?>() ?? 0,
                maTb = r["maTb"].As<string?>(),
                tenTb = r["tenTb"].As<string?>(),
                laGoc = r["maLo"].As<string>() == maLo,
                viTriKho = r["viTriKho"].As<List<object>>()
                    .OfType<IReadOnlyDictionary<string, object>>()
                    .Select(d => new
                    {
                        maKho = d["maKho"]?.ToString(),
                        tenKho = d["tenKho"]?.ToString(),
                        soLuong = Convert.ToInt32(d["soLuong"]),
                    }),
            }),
            edges = edgeRows.Select(r => new
            {
                child = r["child"].As<string>(),
                parent = r["parent"].As<string>(),
                lyDo = r["lyDo"].As<string?>(),
            }),
        };
    });
}
