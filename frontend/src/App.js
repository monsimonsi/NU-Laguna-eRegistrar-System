import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AlumniRegistration from './pages/AlumniRegistration';
import AdminDashboard from './pages/AdminDashboard';
import AdminDocumentTracking from './pages/AdminDocumentTracking';
import Dashboard from './pages/Dashboard';
import DocumentRequest from './pages/DocumentRequest';
import DocumentTracking from './pages/DocumentTracking';
import Payment from './pages/Payment';
import PaymentReturn from './pages/PaymentReturn';
import RequestTracking from './pages/RequestTracking';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/alumni-registration" element={<AlumniRegistration />} />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-document-tracking"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDocumentTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['student', 'alumni']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-request"
          element={
            <ProtectedRoute roles={['student', 'alumni']}>
              <DocumentRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-tracking"
          element={
            <ProtectedRoute roles={['student', 'alumni']}>
              <DocumentTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute roles={['student', 'alumni']}>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/return"
          element={
            <ProtectedRoute roles={['student', 'alumni']}>
              <PaymentReturn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-requests"
          element={
            <ProtectedRoute roles={['student', 'alumni']}>
              <RequestTracking />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
