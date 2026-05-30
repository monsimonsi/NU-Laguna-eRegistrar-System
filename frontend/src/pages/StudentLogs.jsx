import StudentShell from '../components/StudentShell';
import NotificationsPanel from '../components/NotificationsPanel';
import '../styles/Logs.css';

const StudentLogs = () => {
  return (
    <StudentShell activeItem="logs">
      <main className="logs-main logs-student-main">
        <NotificationsPanel
          mode="page"
          title="Logs"
          subtitle="Recent student and alumni notifications in one place."
          className="student-logs"
        />
      </main>
    </StudentShell>
  );
};

export default StudentLogs;