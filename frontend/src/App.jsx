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

// DRH — pages Phase 1
import Shifts       from './pages/Shifts';
import Planning     from './pages/Planning';
import CheckinHistory from './pages/CheckinHistory';
import Alerts       from './pages/Alerts';
import CalendarPage from './pages/CalendarPage';

// DAF — Phase 2
import DafDash      from './pages/DafDash';
import DafInvoices  from './pages/DafInvoices';
import DafExport    from './pages/DafExport';
import DafHistory   from './pages/DafHistory';

// DG — Phase 3
import DgDash       from './pages/DgDash';
import DgBudget     from './pages/DgBudget';
import DgComparatif from './pages/DgComparatif';

// Resp. Cantine — Phase 4
import RcLive       from './pages/RcLive';
import RcMenu       from './pages/RcMenu';

// Employé — Phase 5
import EmpRepas     from './pages/EmpRepas';
import EmpPlanning  from './pages/EmpPlanning';
import EmpCantine   from './pages/EmpCantine';

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
    daf:         '/daf',
    dg:          '/dg',
    rcantine:    '/rc/live',
    tablette:    '/checkin',
    prestataire: '/prestataire',
    admin:       '/admin',
    employe:     '/employe/repas',
  };
  return <Navigate to={map[user.role] || '/dashboard'} replace />;
}

function W({ children, roles }) {
  return (
    <PrivateRoute roles={roles}>
      <Layout>{children}</Layout>
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />

          {/* ── DRH ── */}
          <Route path="/dashboard"        element={<W roles={['drh','admin']}><Dashboard /></W>} />
          <Route path="/employes"         element={<W roles={['drh','admin']}><Employees /></W>} />
          <Route path="/rapport"          element={<W roles={['drh','admin']}><Report /></W>} />
          <Route path="/cantines"         element={<W roles={['drh','admin']}><Canteens /></W>} />
          <Route path="/shifts"           element={<W roles={['drh','admin']}><Shifts /></W>} />
          <Route path="/planning"         element={<W roles={['drh','admin']}><Planning /></W>} />
          <Route path="/checkin-history"  element={<W roles={['drh','admin']}><CheckinHistory /></W>} />
          <Route path="/alertes"          element={<W roles={['drh','admin']}><Alerts /></W>} />
          <Route path="/calendrier"       element={<W roles={['drh','admin']}><CalendarPage /></W>} />

          {/* ── Tablette ── */}
          <Route path="/checkin" element={
            <PrivateRoute roles={['tablette','admin']}>
              <Checkin />
            </PrivateRoute>
          } />

          {/* ── Prestataire ── */}
          <Route path="/prestataire"            element={<W roles={['prestataire']}><PrestDash /></W>} />
          <Route path="/prestataire/menus"      element={<W roles={['prestataire']}><PrestMenus /></W>} />
          <Route path="/prestataire/personnel"  element={<W roles={['prestataire']}><PrestStaff /></W>} />
          <Route path="/prestataire/commandes"  element={<W roles={['prestataire']}><PrestOrders /></W>} />

          {/* ── Admin ── */}
          <Route path="/admin"                  element={<W roles={['admin']}><AdminDash /></W>} />
          <Route path="/admin/entreprises"      element={<W roles={['admin']}><AdminCompanies /></W>} />
          <Route path="/admin/prestataires"     element={<W roles={['admin']}><AdminProviders /></W>} />

          {/* ── DAF ── */}
          <Route path="/daf"                    element={<W roles={['daf','admin']}><DafDash /></W>} />
          <Route path="/daf/factures"           element={<W roles={['daf','admin']}><DafInvoices /></W>} />
          <Route path="/daf/export"             element={<W roles={['daf','admin']}><DafExport /></W>} />
          <Route path="/daf/historique"         element={<W roles={['daf','admin']}><DafHistory /></W>} />

          {/* ── DG ── */}
          <Route path="/dg"                     element={<W roles={['dg','admin']}><DgDash /></W>} />
          <Route path="/dg/budget"              element={<W roles={['dg','admin']}><DgBudget /></W>} />
          <Route path="/dg/comparatif"          element={<W roles={['dg','admin']}><DgComparatif /></W>} />

          {/* ── Resp. Cantine ── */}
          <Route path="/rc/live"                element={<W roles={['rcantine','admin']}><RcLive /></W>} />
          <Route path="/rc/menu"                element={<W roles={['rcantine','admin']}><RcMenu /></W>} />

          {/* ── Employé ── */}
          <Route path="/employe/repas"          element={<W roles={['employe']}><EmpRepas /></W>} />
          <Route path="/employe/planning"       element={<W roles={['employe']}><EmpPlanning /></W>} />
          <Route path="/employe/cantine"        element={<W roles={['employe']}><EmpCantine /></W>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
