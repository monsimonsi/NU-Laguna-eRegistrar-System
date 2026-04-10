import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AlumniRegistration from './pages/AlumniRegistration';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AlumniRegistration />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;