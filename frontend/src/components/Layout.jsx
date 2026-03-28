import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navConfig = {
  drh: [
    { section: 'Principal' },
    { to: '/dashboard',       label: 'Tableau de bord' },
    { to: '/employes',        label: 'Employés' },
    { to: '/shifts',          label: 'Config. shifts' },
    { to: '/planning',        label: 'Planning rotatif' },
    { to: '/rapport',         label: 'Rapports', badge: null },
    { to: '/checkin-history', label: 'Historique check-ins' },
    { to: '/alertes',         label: 'Alertes', badge: 'alerts' },
    { section: 'Configuration' },
    { to: '/cantines',        label: 'Mes cantines' },
    { to: '/calendrier',      label: 'Calendrier & fériés' },
  ],

  daf: [
    { section: 'Finances' },
    { to: '/daf',             label: 'Dashboard finances' },
    { to: '/daf/factures',    label: 'Factures à valider', badge: 'invoices' },
    { to: '/daf/export',      label: 'Export paie / compta' },
    { to: '/daf/historique',  label: 'Historique paiements' },
  ],

  dg: [
    { section: 'Direction' },
    { to: '/dg',              label: 'Vue consolidée' },
    { to: '/dg/budget',       label: 'Budget & Projections' },
    { to: '/dg/comparatif',   label: 'Comparatif cantines' },
  ],

  rcantine: [
    { section: 'Cantine' },
    { to: '/rc/live',         label: 'Vue temps réel' },
    { to: '/rc/menu',         label: 'Menu du jour' },
  ],

  employe: [
    { section: 'Mon espace' },
    { to: '/employe/repas',    label: 'Mes repas' },
    { to: '/employe/planning', label: 'Mon planning' },
    { to: '/employe/cantine',  label: 'Ma cantine' },
  ],

  prestataire: [
    { section: 'Principal' },
    { to: '/prestataire',            label: 'Vue d\'ensemble' },
    { to: '/prestataire/menus',      label: 'Menus' },
    { to: '/prestataire/personnel',  label: 'Personnel' },
    { to: '/prestataire/commandes',  label: 'Commandes' },
  ],

  admin: [
    { section: 'DRH' },
    { to: '/dashboard',       label: 'Tableau de bord' },
    { to: '/employes',        label: 'Employés' },
    { to: '/shifts',          label: 'Config. shifts' },
    { to: '/planning',        label: 'Planning rotatif' },
    { to: '/rapport',         label: 'Rapports' },
    { to: '/checkin-history', label: 'Historique check-ins' },
    { to: '/alertes',         label: 'Alertes' },
    { section: 'Plateforme' },
    { to: '/admin',              label: 'Vue globale' },
    { to: '/admin/entreprises',  label: 'Entreprises' },
    { to: '/admin/prestataires', label: 'Prestataires' },
    { section: 'Finance' },
    { to: '/daf',             label: 'Dashboard DAF' },
    { to: '/daf/factures',    label: 'Factures' },
  ],
};

const roleLabel = {
  drh:         'DRH',
  daf:         'DAF',
  dg:          'Direction',
  rcantine:    'Resp. Cantine',
  employe:     'Employé',
  admin:       'Admin',
  prestataire: 'Prestataire',
  tablette:    'Tablette',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navConfig[user?.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">C</div>
          <div>
            <div className="logo-text">CantineTrack</div>
            <div className="logo-sub">{user?.company_name || roleLabel[user?.role]}</div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {items.map((item, i) =>
            item.section
              ? <div className="nav-section" key={i}>{item.section}</div>
              : (
                <NavLink
                  key={i}
                  to={item.to}
                  end={['/dashboard', '/admin', '/daf', '/dg', '/prestataire'].includes(item.to)}
                  className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                >
                  {item.label}
                </NavLink>
              )
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="av">
              {user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : '?'}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                {roleLabel[user?.role]}
              </div>
            </div>
            <button onClick={handleLogout}>Quitter</button>
          </div>
        </div>
      </aside>

      <div className="main">{children}</div>
    </div>
  );
}
