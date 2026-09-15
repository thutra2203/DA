namespace backend_dotnet.Services.Graph;

// Ánh xạ mục "Neo4j" trong appsettings.json.
public class Neo4jOptions
{
    public bool Enabled { get; set; }
    public string Uri { get; set; } = "bolt://localhost:7687";
    public string User { get; set; } = "neo4j";
    public string Password { get; set; } = "neo4j";
    public string Database { get; set; } = "neo4j";
    public bool SyncOnStartup { get; set; } = true;
    public int SyncIntervalMinutes { get; set; } = 15;
}

// Ném ra khi Neo4j bị tắt hoặc không kết nối được — controller bắt lại và trả 503 kèm cờ available=false
// để phần Tổng quan hiển thị "chưa bật đồ thị" thay vì lỗi đỏ.
public class GraphUnavailableException(string message, Exception? inner = null) : Exception(message, inner);
