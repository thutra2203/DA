import { usePageTitle } from '../context/PageHeaderContext';
import GraphOverview from '../components/graph/GraphOverview';
import './Dashboard.css';

export default function Dashboard() {
  usePageTitle('Tổng quan');

  return (
    <div>
      <GraphOverview />
    </div>
  );
}
