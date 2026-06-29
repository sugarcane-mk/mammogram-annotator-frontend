import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Patients from './pages/Patients';
import Gallery from './pages/Gallery';
import Annotate from './pages/Annotate';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RequestAccessPage from './pages/RequestAccessPage';
import AdminDashboard from './pages/AdminDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import GeneralUserDashboard from './pages/GeneralUserDashboard';
import AuthGate from './components/auth/AuthGate';
import { getCurrentUserDetails, seedDefaultData } from './rbac/auth';
import { useAppStore } from './store/store';

function App() {
  const [ready, setReady] = useState(false);
  const setAuthUser = useAppStore((state) => state.setAuthUser);

  useEffect(() => {
    const initializeAuth = async () => {
      await seedDefaultData();
      const existingUser = await getCurrentUserDetails();
      if (existingUser) {
        setAuthUser(existingUser);
      }
      setReady(true);
    };

    initializeAuth();
  }, [setAuthUser]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p>Initializing access control...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />

        {/* Protected Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/hospital" element={
          <ProtectedRoute requiredRoles={['hospital']}>
            <HospitalDashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute requiredRoles={['general']}>
            <GeneralUserDashboard />
          </ProtectedRoute>
        } />

        {/* Legacy Routes - Wrapped in Auth & Layout */}
        <Route element={
          <AuthGate>
            <Layout />
          </AuthGate>
        }>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/annotate/:imageId" element={<Annotate />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
