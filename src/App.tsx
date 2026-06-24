import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Patients from './pages/Patients';
import Gallery from './pages/Gallery';
import Annotate from './pages/Annotate';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="annotate/:imageId" element={<Annotate />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
