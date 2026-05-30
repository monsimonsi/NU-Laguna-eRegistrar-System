import AdminShell from '../components/AdminShell';
import NotificationsPanel from '../components/NotificationsPanel';
import '../styles/Logs.css';

const AdminLogs = () => {
  return (
    <AdminShell>
      <main className="logs-main logs-admin-main">
        <NotificationsPanel
          mode="page"
          title="Logs"
          subtitle="Recent admin notifications, alerts, and updates in one view."
          className="admin-logs"
        />
      </main>
    </AdminShell>
  );
};

export default AdminLogs;