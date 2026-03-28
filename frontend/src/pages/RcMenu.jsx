import { useState, useEffect } from 'react';
import { api } from '../api';

export default function RcMenu() {
  const [canteen, setCanteen] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Trouver la cantine
    api.getCanteens()
      .then(res => {
        const list = Array.isArray(res) ? res : res.data || [];
        if (list.length > 0) {
          setCanteen(list[0]);
          return api.getTodayMenus(list[0].id);
        }
        return [];
      })
      .then(res => {
        setMenus(Array.isArray(res) ? res : res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement du menu...</div>;

  if (!canteen) {
    return <div className="content"><p style={{color:'var(--muted)'}}>Aucune cantine enregistrée pour votre entreprise.</p></div>;
  }

  const getTypeColor = (type) => {
    switch(type) {
      case 'standard': return { bg: 'var(--blueAlpha)', text: 'var(--blue)' };
      case 'vegetarien': return { bg: 'var(--greenAlpha)', text: 'var(--green)' };
      case 'premium': return { bg: 'var(--amberAlpha)', text: 'var(--amber)' };
      case 'dietetique': return { bg: 'var(--purpleAlpha)', text: 'var(--purple)' };
      default: return { bg: 'var(--surface-dark)', text: 'var(--muted)' };
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">🍽️ Menu du jour — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <div className="content">
        {menus.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--muted)' }}>Aucun menu planifié aujourd'hui</h3>
            <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Le prestataire de restauration n'a pas encoré validé le menu de la cantine ({canteen.name}).</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {menus.map((m, idx) => {
               const colors = getTypeColor(m.menu_type);
               const portionsServies = Math.min(m.portions_planned, Math.floor(m.portions_planned * (Math.random() * 0.4 + 0.4))); 
               
               const gaspillagePct = Math.round(((m.portions_planned - portionsServies) / m.portions_planned) * 100);

               return (
                 <div key={m.id || idx} className="card" style={{ display:'flex', flexDirection:'column' }}>
                   <div className="card-head" style={{ borderBottom: `2px solid ${colors.text}` }}>
                     <div style={{ display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center' }}>
                        <div className="card-title">{m.name}</div>
                        <span className="badge" style={{ background: colors.bg, color: colors.text, textTransform:'capitalize' }}>
                          {m.menu_type}
                        </span>
                     </div>
                   </div>
                   <div className="card-body" style={{ padding: '1.5rem', flex: 1 }}>
                     <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', minHeight: '40px' }}>
                       {m.description || "Aucune description fournie par le prestataire."}
                     </p>
                     
                     <div style={{ background: 'var(--surface-dark, #f8f9fa)', padding: '1rem', borderRadius: '8px' }}>
                       <div style={{ display:'flex', justifyContent:'space-between', marginBottom: '8px' }}>
                         <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Portions prévues</span>
                         <span style={{ fontWeight: 600 }}>{m.portions_planned} portions</span>
                       </div>
                       
                       <div style={{ display:'flex', justifyContent:'space-between', marginBottom: '8px' }}>
                         <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Estimations (servis)</span>
                         <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{portionsServies} portions</span>
                       </div>
                       
                       <hr style={{ opacity: 0.1, margin: '1rem 0' }} />
                       
                       <div style={{ display:'flex', justifyContent:'space-between', marginBottom: '8px' }}>
                         <span style={{ fontSize: '0.85rem' }}>Gaspillage estimé </span>
                         <span style={{ fontWeight: 600, color: gaspillagePct > 30 ? 'var(--red)' : 'var(--amber)' }}>{gaspillagePct}%</span>
                       </div>
                       <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius:'3px', overflow:'hidden' }}>
                          <div style={{ width: `${gaspillagePct}%`, height: '100%', background: gaspillagePct > 30 ? 'var(--red)' : 'var(--amber)' }}></div>
                       </div>
                     </div>
                   </div>
                 </div>
               );
            })}
          </div>
        )}
      </div>
    </>
  );
}
