import '../styles/shared.css';

export default function ComingSoon({ title, icon, desc }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-icon" style={{ background: '#f0f4ff', fontSize: 22 }}>{icon}</div>
          <div>
            <h2 className="page-title">{title}</h2>
            <p className="page-sub">Chức năng nghiệp vụ</p>
          </div>
        </div>
      </div>

      <div className="data-card">
        <div className="empty-state">
          <div className="empty-state-icon">🚧</div>
          <div className="empty-state-title">Đang phát triển</div>
          <div className="empty-state-desc">{desc}</div>
        </div>
      </div>
    </div>
  );
}
