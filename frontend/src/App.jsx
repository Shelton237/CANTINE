import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout       from './components/Layout';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Employees    from './pages/Employees';
import Report       from './pages/Report';
import Canteens     from './pages/Canteens';
import Checkin      from './pages/Checkin';
import PrestDash    from './pages/PrestDash';
import PrestMenus   from './pages/PrestMenus';
import PrestStaff   from './pages/PrestStaff';
import PrestOrders  from './pages/PrestOrders';
import AdminDash    from './pages/AdminDash';
import AdminCompanies from './pages/AdminCompanies';
import AdminProviders from './pages/AdminProviders';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = {
    drh:         '/dashboard',
    tablette:    '/checkin',
    prestataire: '/prestataire',
    admin:       '/admin',
  };
  return <Navigate to={map[user.role] || '/dashboard'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />

          {/* DRH */}
          <Route path="/dashboard" element={
            <PrivateRoute roles={['drh','admin']}>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/employes" element={
            <PrivateRoute roles={['drh','admin']}>
              <Layout><Employees /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/rapport" element={
            <PrivateRoute roles={['drh','admin']}>
              <Layout><Report /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/cantines" element={
            <PrivateRoute roles={['drh','admin']}>
              <Layout><Canteens /></Layout>
            </PrivateRoute>
          }/>

          {/* Tablette */}
          <Route path="/checkin" element={
            <PrivateRoute roles={['tablette','admin']}>
              <Checkin />
            </PrivateRoute>
          }/>

          {/* Prestataire */}
          <Route path="/prestataire" element={
            <PrivateRoute roles={['prestataire']}>
              <Layout><PrestDash /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/prestataire/menus" element={
            <PrivateRoute roles={['prestataire']}>
              <Layout><PrestMenus /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/prestataire/personnel" element={
            <PrivateRoute roles={['prestataire']}>
              <Layout><PrestStaff /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/prestataire/commandes" element={
            <PrivateRoute roles={['prestataire']}>
              <Layout><PrestOrders /></Layout>
            </PrivateRoute>
          }/>

          {/* Admin */}
          <Route path="/admin" element={
            <PrivateRoute roles={['admin']}>
              <Layout><AdminDash /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/admin/entreprises" element={
            <PrivateRoute roles={['admin']}>
              <Layout><AdminCompanies /></Layout>
            </PrivateRoute>
          }/>
          <Route path="/admin/prestataires" element={
            <PrivateRoute roles={['admin']}>
              <Layout><AdminProviders /></Layout>
            </PrivateRoute>
          }/>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
