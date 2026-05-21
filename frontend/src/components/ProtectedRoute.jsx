import { Navigate, useLocation } from 'react-router-dom';
import { getStoredToken, parseJwtPayload } from '../api';

export default function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const token = getStoredToken();
  const payload = parseJwtPayload(token);

  if (!payload || !payload.sub) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(payload.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
