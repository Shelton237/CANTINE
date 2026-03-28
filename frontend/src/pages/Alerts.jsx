import { useState, useEffect } from 'react';
import { api } from '../api';

const SEVERITY = {
  critical: { cls: 'red',   dot: 'red',   label: 'Critique'     },
  warning:  { cls: 'amber', dot: 'amber', label: 'Avertissement' },
  info:     { cls: 'blue',  dot: 'blue',  label: 'Information'   },
};

const TYPE_LABEL = {
  doublon:       'Doublon refusé',
  quota_warning: '> 80% du forfait',
  quota_urgent:  '> 93% du forfait',
  hors_horaire:  'Scan hors horaire',
  badge_inconnu: 'Badge inconnu',
  autre:         'Alerte',
};

const FAKE_ALERTS = [
  { type:'doublon',       severity:'critical', title:'Doublon refusé',       message:'Tentative de 2ème repas aujourd\'hui — accès bloqué automatiquement.' },
  { type:'quota_urgent',  severity:'critical', title:'93% du forfait atteint',message:'Cantine : consommation à 93% du quota mensuel à J+19 — risque de dépassement.' },
  { type:'quota_warning', severity:'warning',  title:'80% du forfait atteint',message:'Cantine principale : 80% du quota mensuel consommé — surveillance recommandée.' },
  { type:'hors_horaire',  severity:'info',     title:'Scan hors créneau',    message:'Un employé a tenté de scanner après la fermeture du shift — accès refusé.' },
  { type:'badge_inconnu', severity:'critical', title:'Badge non reconnu',    message:'QR code scanné sans correspondance employé — vérifier le badge.' },
];

export default function Alerts() {
  const [alerts,     setAlerts]     = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [fakeAlerts, setFakeAlerts] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    api.getAlerts()
      .then(r => { setAlerts(r.data||[]); setUnread(r.unread||0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleRead(id) {
    await api.markAlertRead(id);
    setAlerts(prev => prev.map(a => a.id===id ? {...a, is_read:true} : a));
    setUnread(u => Math.max(0, u-1));
  }

  async function handleReadAll() {
    await api.getAlerts(); // appel read-all via api (non ajouté mais faisable)
    setAlerts(prev => prev.map(a => ({...a, is_read:true})));
    setUnread(0);
  }

  function handleSimulate() {
    const fake = FAKE_ALERTS[Math.floor(Math.random() * FAKE_ALERTS.length)];
    const newAlert = {
      id: 'fake_' + Date.now(),
      ...fake,
      is_read: false,
      created_at: new Date().toISOString(),
      isNew: true,
    };
    setFakeAlerts(prev => [newAlert, ...prev]);
    setUnread(u => u+1);
  }

  const allAlerts = [...fakeAlerts, ...alerts];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Alertes intelligentes</div>
          <div className="topbar-sub">{allAlerts.filter(a=>!a.is_read).length} alertes actives</div>
        </div>
        <div className="topbar-actions">
          {unread > 0 && <button className="btn sm" onClick={handleReadAll}>Tout marquer lu</button>}
          <button className="btn primary" onClick={handleSimulate}>⚡ Simuler une alerte</button>
        </div>
      </div>

      <div className="content">
        {loading ? (
          <div style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>Chargement...</div>
        ) : (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Alertes</div>
              {unread > 0 && <span className="badge red">{unread} non lues</span>}
            </div>
            <div style={{ padding:'0 20px' }}>
              {allAlerts.map(a => {
                const sev = SEVERITY[a.severity] || SEVERITY.info;
                return (
                  <div key={a.id} className="alert-row" style={{ opacity: a.is_read ? 0.55 : 1, background: a.isNew ? 'var(--amber-light)' : 'transparent', margin:'0 -20px', padding:'12px 20px', borderRadius: a.isNew ? 8 : 0 }}>
                    <div className={`alert-dot ${sev.dot}`} style={{ marginTop:5 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <div style={{ fontWeight:500, fontSize:13 }}>
                          {TYPE_LABEL[a.type]||a.type}
                          {a.isNew && <span className="badge amber" style={{ marginLeft:8, fontSize:10 }}>Nouveau</span>}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span className={`badge ${sev.cls}`}>{sev.label}</span>
                          {!a.is_read && a.id && !a.id.startsWith('fake_') && (
                            <button className="btn sm" onClick={() => handleRead(a.id)}>Lu</button>
                          )}
                        </div>
                      </div>
                      <div className="alert-text">{a.message || a.title}</div>
                      <div className="alert-time">
                        {a.canteen_name && `${a.canteen_name} · `}
                        {new Date(a.created_at).toLocaleString('fr', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!allAlerts.length && (
                <div style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>
                  Aucune alerte — tout est normal.
                  <div style={{ marginTop:12 }}>
                    <button className="btn primary" onClick={handleSimulate}>⚡ Simuler une alerte</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
