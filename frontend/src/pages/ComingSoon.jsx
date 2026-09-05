import '../styles/shared.css';
import { usePageTitle } from '../context/PageHeaderContext';

export default function ComingSoon({ title, icon, desc }) {
  usePageTitle(title);
  return (
    <div>
      <div className="page-header">
        <p className="page-sub">Chức năng nghiệp vụ</p>
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
