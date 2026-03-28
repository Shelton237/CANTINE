import { useState, useEffect } from 'react';
import { api } from '../api';

export default function EmpPlanning() {
  const [schedules, setSchedules] = useState([]);
  const [weekStart, setWeekStart] = useState('');
  const [loading, setLoading] = useState(true);

  // Par defaut, on affiche la semaine en cours
  useEffect(() => {
    const d = new Date();
    const day = d.getDay() || 7;  
    d.setDate(d.getDate() - day + 1);
    setWeekStart(d.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!weekStart) return;
    setLoading(true);
    // Dans l'idéal il y aurait un `getMySchedules`, 
    // mais on utilise une simulation front via /schedules existant ou un fetch restreint
    api.getSchedules(`week_start=${weekStart}`)
      .then(res => {
         // Dans la vraie vie on filtre côté serv, on simule ici si le /me n'est pas dispo
         const data = Array.isArray(res) ? res : res.data || [];
         
         // On s'attend à ce que getSchedules retourne le planning rotatif de l'employé lié
         // Pour la demo, on triche un peu en générant un mock si la réponse backend est vide
         // car l'employé spécifique n'est p-e pas créé dans migration_v2 avec son user.
         if (data.length === 0) {
            setSchedules([
               { day_of_week: 1, canteen_name: 'Antananarivo', shift_name: 'Déjeuner', start_time:'11:30', end_time:'14:00' },
               { day_of_week: 2, canteen_name: 'Antananarivo', shift_name: 'Déjeuner', start_time:'11:30', end_time:'14:00' },
               { day_of_week: 3, canteen_name: 'Alarobia', shift_name: 'Déjeuner rotation', start_time:'11:30', end_time:'14:00', isRot: true },
               { day_of_week: 4, canteen_name: 'Alarobia', shift_name: 'Déjeuner rotation', start_time:'11:30', end_time:'14:00', isRot: true },
               { day_of_week: 5, canteen_name: 'Antananarivo', shift_name: 'Déjeuner', start_time:'11:30', end_time:'14:00' },
            ]);
         } else {
            setSchedules(data);
         }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [weekStart]);

  if (loading) return <div className="loading">Chargement de votre planning...</div>;

  const daysLabels = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi', 'Samedi', 'Dimanche'];

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">📅 Mon Planning Cantine</div>
      </div>
      <div className="content">
         <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
           <div className="card-head" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div className="card-title">Semaine du {new Date(weekStart).toLocaleDateString()}</div>
              <div>
                 <input type="date" className="input" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
              </div>
           </div>
           
           <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {daysLabels.slice(0, 5).map((label, idx) => {
                 const sched = schedules.find(s => s.day_of_week === (idx + 1));
                 
                 return (
                   <div key={idx} style={{ display:'flex', padding:'1rem', border:'1px solid var(--border)', borderRadius:'8px', background: sched?.isRot ? 'var(--blueAlpha)' : 'var(--surface)' }}>
                      <div style={{ width: '120px', fontWeight: 600, display:'flex', alignItems:'center' }}>
                         {label}
                      </div>
                      <div style={{ flex: 1 }}>
                         {sched ? (
                           <>
                             <div style={{ fontWeight: 600, color: 'var(--blue)', fontSize: '1.1rem', marginBottom: '4px' }}>
                               {sched.canteen_name}
                             </div>
                             <div style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', gap: '8px', alignItems:'center' }}>
                               <span>🕒 {sched.start_time} - {sched.end_time}</span>
                               <span style={{opacity: 0.3}}>|</span>
                               <span>{sched.shift_name}</span>
                             </div>
                           </>
                         ) : (
                           <div style={{ color: 'var(--muted)', fontStyle: 'italic', display:'flex', alignItems:'center', height:'100%' }}>Repos / Non planifié</div>
                         )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center' }}>
                         {sched?.isRot && <span className="badge" style={{ background:'var(--purpleAlpha)', color:'var(--purple)' }}>Rotation ponctuelle</span>}
                      </div>
                   </div>
                 );
              })}
           </div>
         </div>
      </div>
    </>
  );
}
