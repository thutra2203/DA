# Đồ thị Neo4j cho phần Tổng quan

Neo4j chạy **song song** SQL Server. SQL Server (`VKTB`) vẫn là nguồn sự thật duy nhất;
Neo4j chỉ là **bản sao đọc** được dựng lại định kỳ từ SQL Server để phục vụ các đồ thị
trên trang Tổng quan (dòng đời lô, mạng luân chuyển giữa kho).

## 1. Chạy Neo4j

```bash
docker compose up -d          # từ thư mục gốc dự án
```

| | |
|---|---|
| Trình duyệt Neo4j | http://localhost:7474 |
| Bolt (cho backend) | `bolt://localhost:7687` |
| Tài khoản | `neo4j` / `neo4j_matkhau_manh` |

Tắt tính năng: đặt `Neo4j:Enabled = false` trong `backend-dotnet/appsettings.json`.
Khi tắt hoặc khi Neo4j không kết nối được, giao diện hiển thị thông báo "Chưa bật đồ thị"
thay vì lỗi.

## 2. Đồng bộ dữ liệu

`GraphSyncWorker` (chạy nền trong backend) tự dựng lại toàn bộ đồ thị:
- 1 lần lúc khởi động (`Neo4j:SyncOnStartup`)
- lặp lại mỗi `Neo4j:SyncIntervalMinutes` phút (mặc định 15)

Đồng bộ thủ công: nút **"Đồng bộ lại"** trên trang Tổng quan (chỉ ADMIN) hoặc
`POST /api/graph/dong-bo`.

## 3. Mô hình đồ thị

```
(:Kho   {maKho, tenKho, tenTinh, diaChi, dienTich, tenLoaiKho})
(:Tbdb  {maTbdb, tenTbdb})
(:Lo    {maLo, maTbdb, maCcl, tenCcl, trangThai, namSx, tongTon})

(:Lo)-[:THUOC_TB]->(:Tbdb)
(:Lo)-[:O_KHO {soLuong}]->(:Kho)
(:Lo)-[:TACH_TU {lyDo}]->(:Lo)              // lô con -> lô gốc
(:Kho)-[:LUAN_CHUYEN {soLuot, tongSl}]->(:Kho)
```

- **`TACH_TU`** suy ra từ `LoTbdb.GhiChu` — cả lệnh chuyển cấp chất lượng và lệnh thay đổi
  hình thức niêm cất khi tách một phần đều ghi `Tách từ lô "MÃ_LÔ_GỐC" do ...`.
- **`LUAN_CHUYEN`** suy ra từ `Lenh` có cả `MaKhoXuat` lẫn `MaKhoNhap` và hai kho khác nhau.

## 4. API

| Endpoint | Mô tả |
|---|---|
| `GET /api/graph/tong-quan` | KPI + mạng luân chuyển thu gọn (cho Dashboard) |
| `GET /api/graph/luan-chuyen-kho` | Mạng luân chuyển đầy đủ (mọi kho) |
| `GET /api/graph/kho/{maKho}/thuc-luc` | Thực lực 1 kho: thông tin kho + trang bị hiện có theo cấp chất lượng |
| `GET /api/graph/lo?q=` | Tìm lô để tra dòng đời |
| `GET /api/graph/dong-doi-lo/{maLo}` | Dòng đời 1 lô (tổ tiên + hậu duệ) |
| `POST /api/graph/dong-bo` | Dựng lại đồ thị (ADMIN) |

## 5. Một vài truy vấn Cypher hữu ích (chạy trong trình duyệt Neo4j)

```cypher
// Chuỗi tách lô dài nhất
MATCH p = (l:Lo)-[:TACH_TU*]->(root:Lo)
WHERE NOT (root)-[:TACH_TU]->()
RETURN [n IN nodes(p) | n.maLo] AS chuoi, length(p) AS soCap
ORDER BY soCap DESC LIMIT 5;

// Toàn bộ hậu duệ của 1 lô
MATCH (l:Lo {maLo: 'LO001'})<-[:TACH_TU*]-(con:Lo)
RETURN con.maLo, con.trangThai, con.tongTon;

// Kho nào luân chuyển nhiều nhất
MATCH (k:Kho)-[r:LUAN_CHUYEN]-(:Kho)
RETURN k.tenKho, count(r) AS soKetNoi ORDER BY soKetNoi DESC;
```

## 6. Cấu trúc mã nguồn

```
docker-compose.yml
backend-dotnet/
  Services/Graph/
    Neo4jOptions.cs        # cấu hình + GraphUnavailableException
    GraphSyncService.cs    # dựng lại đồ thị từ SQL Server
    GraphSyncWorker.cs     # BackgroundService: chạy đồng bộ định kỳ
    GraphQueryService.cs   # các truy vấn đọc cho Tổng quan
  Controllers/GraphController.cs
frontend/src/
  components/graph/
    NetworkGraph.jsx       # bọc vis-network
    GraphOverview.jsx      # khối đồ thị trên Dashboard
  pages/tbDongBo/DongDoiLo.jsx   # trang tra dòng đời lô
```
