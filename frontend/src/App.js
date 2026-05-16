import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AlumniRegistration from './pages/AlumniRegistration';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import DocumentRequest from './pages/DocumentRequest';
import DocumentTracking from './pages/DocumentTracking';
import Payment from './pages/Payment';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/alumni-registration" element={<AlumniRegistration />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/document-request" element={<DocumentRequest />} />
        <Route path="/document-tracking" element={<DocumentTracking />} />
        <Route path="/payment" element={<Payment />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
