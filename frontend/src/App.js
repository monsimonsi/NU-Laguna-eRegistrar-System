import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AlumniRegistration from './pages/AlumniRegistration';
import AdminDashboard from './pages/AdminDashboard';
import DocumentRequest from './pages/DocumentRequest';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/alumni-registration" element={<AlumniRegistration />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/document-request" element={<DocumentRequest />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;