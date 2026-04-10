import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AlumniRegistration from './pages/AlumniRegistration';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/alumni-registration" element={<AlumniRegistration />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;