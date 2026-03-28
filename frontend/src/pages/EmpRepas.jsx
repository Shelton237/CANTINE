import { useState, useEffect } from 'react';
import { api } from '../api';

export default function EmpRepas() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ monthTotal: 0, lastCheckin: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On recupere l'historique personnel (20 derniers)
    api.getMyCheckins('limit=20')
      .then(res => {
        const data = Array.isArray(res) ? res : res.data || [];
        setHistory(data);

        // Calcul simple pour la démo: repas du mois courant
        if (data.length > 0) {
          const currentMonth = new Date().getMonth();
          const monthTotal = data.filter(c => new Date(c.checked_at).getMonth() === currentMonth && c.status === 'approved').length;
          setStats({
            monthTotal,
            lastCheckin: data.find(c => c.status === 'approved')
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement profil...</div>;

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">🍽️ Mes Repas</div>
      </div>
      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-label">Repas ce mois</div>
            <div className="kpi-value">{stats.monthTotal}</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">Dernier accès</div>
            <div className="kpi-value" style={{ fontSize: '1.2rem' }}>
               {stats.lastCheckin 
                  ? new Date(stats.lastCheckin.checked_at).toLocaleDateString('fr-FR', {day:'numeric', month:'short'}) 
                  : '-'}
               <br/>
               <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                 {stats.lastCheckin ? new Date(stats.lastCheckin.checked_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Aucun pointage'}
               </span>
            </div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-label">Ma Satisfaction (moyenne)</div>
            <div className="kpi-value">4.5 <span style={{fontSize:'1rem', color:'var(--muted)'}}>/ 5</span></div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-head">
            <div className="card-title">Historique de mes pointages (Derniers 30 jours)</div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date et Heure</th>
                  <th>Cantine</th>
                  <th>Shift</th>
                  <th style={{textAlign:'right'}}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign:'center', padding:'1.5rem', color:'var(--muted)'}}>Aucun historique de repas récemnment.</td></tr>
                ) : history.map((c, idx) => (
                  <tr key={c.id || idx}>
                    <td>
                       <strong>{new Date(c.checked_at).toLocaleDateString('fr-FR')}</strong> à 
                       {' '} {new Date(c.checked_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </td>
                    <td>{c.canteen_name}</td>
                    <td>{c.shift_name || '-'}</td>
                    <td style={{textAlign:'right'}}>
                      {c.status === 'approved' && <span className="badge" style={{background:'var(--greenAlpha)', color:'var(--green)'}}>Accès Autorisé</span>}
                      {c.status === 'refused_already_eaten' && <span className="badge" style={{background:'var(--redAlpha)', color:'var(--red)'}}>Refus (Déjà mangé)</span>}
                      {c.status === 'refused_wrong_shift' && <span className="badge" style={{background:'var(--redAlpha)', color:'var(--red)'}}>Refus (Hors horaires)</span>}
                      {c.status === 'refused_suspended' && <span className="badge" style={{background:'var(--redAlpha)', color:'var(--red)'}}>Refus (Suspendu)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
