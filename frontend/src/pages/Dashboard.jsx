import { usePageTitle } from '../context/PageHeaderContext';
import GraphOverview from '../components/graph/GraphOverview';
import ThongKeTongQuan from '../components/dashboard/ThongKeTongQuan';
import './Dashboard.css';

export default function Dashboard() {
  usePageTitle('Tổng quan');

  return (
    <div>
      <GraphOverview />
      <ThongKeTongQuan />
    </div>
  );
}
