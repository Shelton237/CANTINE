import { useState, useEffect } from 'react';
import { api } from '../api';

export default function EmpCantine() {
  const [canteen, setCanteen] = useState(null);
  const [weekMenus, setWeekMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Récupérer la cantine
    api.getCanteens()
      .then(res => {
        const cList = Array.isArray(res) ? res : res.data || [];
        if (cList.length > 0) {
          setCanteen(cList[0]);
          return api.getWeekMenus(cList[0].id);
        }
        return [];
      })
      .then(res => {
         const mList = Array.isArray(res) ? res : res.data || [];
         setWeekMenus(mList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement des menus...</div>;

  if (!canteen) {
     return <div className="content"><p style={{color:'var(--muted)'}}>Aucune cantine affectée actuellement.</p></div>;
  }

  // Grouper les menus par jour (service_date)
  const groupedMenus = {};
  weekMenus.forEach(m => {
     let dateKey = m.service_date.split('T')[0];
     if (!groupedMenus[dateKey]) {
        groupedMenus[dateKey] = [];
     }
     groupedMenus[dateKey].push(m);
  });
  
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
        <div className="topbar-title">🥗 Ma Cantine / Menu</div>
      </div>
      <div className="content">
         <div className="kpi-grid">
            <div className="kpi-card blue">
               <div className="kpi-label">Où déjeuner aujourd'hui ?</div>
               <div className="kpi-value" style={{ fontSize: '1.2rem', color:'var(--blue)' }}>{canteen.name}</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                 {canteen.status === 'open' ? '🟢 En service' : '🔴 Fermée act.'}
               </div>
            </div>
            <div className="kpi-card green">
               <div className="kpi-label">Horaires Shift</div>
               <div className="kpi-value" style={{ fontSize: '1.2rem' }}>{canteen.opening_time} - {canteen.closing_time}</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tolérance : ± 15 mins</div>
            </div>
            <div className="kpi-card purple">
               <div className="kpi-label">Derniers Jours Fériés</div>
               <div className="kpi-value" style={{ fontSize: '1.2rem' }}>Ven 29 Mars</div>
               <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Jour des Martyrs</div>
            </div>
         </div>

         <div className="card" style={{ marginTop: '1.5rem' }}>
           <div className="card-head">
              <div className="card-title">Menus de la semaine — {canteen.name}</div>
           </div>
           
           {Object.keys(groupedMenus).length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color:'var(--muted)' }}>
                 Les menus de la semaine n'ont pas encore été publiés.
              </div>
           ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', padding: '1.5rem' }}>
                 {Object.keys(groupedMenus).sort().map(d => {
                    const dateObj = new Date(d);
                    const dayLabel = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day:'numeric', month:'numeric' });
                    const isToday = d === new Date().toISOString().split('T')[0];

                    return (
                       <div key={d} style={{ border: isToday ? '2px solid var(--blue)' : '1px solid var(--border)', borderRadius: '8px', padding: '1.2rem', position: 'relative' }}>
                          {isToday && <span style={{position:'absolute', top: -12, right: 16, background:'var(--blue)', color:'#fff', padding:'2px 8px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'bold'}}>Aujourd'hui</span>}
                          
                          <h4 style={{ margin:'0 0 1rem 0', color: isToday ? 'var(--blue)' : 'inherit', borderBottom:'1px dashed var(--border)', paddingBottom:'0.5rem', textTransform: 'capitalize' }}>
                            {dayLabel}
                          </h4>
                          
                          <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
                            {groupedMenus[d].map(m => {
                               const styles = getTypeColor(m.menu_type);
                               return (
                                 <div key={m.id} style={{ display:'flex', flexDirection:'column', gap:'6px', background:'var(--surface-dark, #f8f9fa)', padding:'0.8rem', borderRadius:'6px' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                                       <strong>{m.name}</strong>
                                       <span className="badge" style={{ background: styles.bg, color: styles.text }}>
                                          {m.menu_type}
                                       </span>
                                    </div>
                                    <p style={{ margin:0, fontSize:'0.85rem', color:'var(--muted)' }}>
                                       {m.description || "Aucune description fournie"}
                                    </p>
                                 </div>
                               );
                            })}
                          </div>
                          
                          {isToday && (
                            <div style={{ marginTop:'1rem', textAlign:'right' }}>
                              <button className="btn primary" onClick={() => alert('Votre repas pour aujourd\'hui a été confirmé !')} style={{ width: '100%' }}>🍽️ Confirmer mon choix pour Midi</button>
                            </div>
                          )}
                       </div>
                    );
                 })}
              </div>
           )}
         </div>
      </div>
    </>
  );
}
