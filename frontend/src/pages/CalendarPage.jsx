import { useState, useEffect } from 'react';
import { api } from '../api';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_H  = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

export default function CalendarPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    api.getHolidays(year).then(setHolidays).catch(console.error);
  }, [year]);

  // Jours fériés du mois courant sous forme de Set "YYYY-MM-DD"
  const holidaySet = new Set(holidays.map(h => h.date?.split('T')[0]));

  // Construire la grille du mois
  function buildGrid() {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month+1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // 0=lundi
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); }

  function pad(n) { return String(n).padStart(2,'0'); }
  function cellDate(d) { return `${year}-${pad(month+1)}-${pad(d)}`; }
  function isToday(d) { return year===today.getFullYear() && month===today.getMonth() && d===today.getDate(); }
  function isHoliday(d) { return d && holidaySet.has(cellDate(d)); }
  function getHolidayName(d) { const h = holidays.find(h => h.date?.split('T')[0] === cellDate(d)); return h?.name || ''; }

  const grid = buildGrid();
  const yearHolidays = holidays.filter(h => new Date(h.date).getFullYear() === year);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Calendrier & jours fériés malgaches</div>
          <div className="topbar-sub">{MONTHS[month]} {year}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn sm" onClick={prevMonth}>← Préc.</button>
          <button className="btn sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Aujourd'hui</button>
          <button className="btn sm" onClick={nextMonth}>Suiv. →</button>
        </div>
      </div>

      <div className="content">
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:'var(--red-light)', border:'1px solid var(--red)' }}></div> Férié national
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--blue)' }}></div> Aujourd'hui
          </div>
        </div>

        <div className="grid-6-4">
          {/* Calendrier */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">{MONTHS[month]} {year}</div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
                {DAYS_H.map(d => (
                  <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:500, color:'var(--muted)', padding:'4px 0' }}>{d}</div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                {grid.map((d, i) => {
                  const holiday = isHoliday(d);
                  const _today  = isToday(d);
                  return (
                    <div key={i} title={holiday ? getHolidayName(d) : undefined}
                      style={{
                        textAlign:'center', padding:'7px 4px', borderRadius:8, fontSize:13,
                        background: _today   ? 'var(--blue)'       :
                                    holiday  ? 'var(--red-light)'  : 'transparent',
                        color:       _today  ? 'white'             :
                                    holiday  ? 'var(--red)'        :
                                    !d       ? 'transparent'       : 'var(--ink2)',
                        fontWeight:  _today  ? 600                 : 400,
                        cursor:      holiday ? 'help'              : 'default',
                        border:      holiday ? '1px solid var(--red)' : '1px solid transparent',
                      }}>
                      {d || ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Liste jours fériés */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Jours fériés {year} — Madagascar</div>
            </div>
            <div>
              {yearHolidays.length ? yearHolidays.map(h => {
                const d = new Date(h.date);
                return (
                  <div key={h.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 20px', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ minWidth:50, textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:500, color:'var(--red)' }}>{d.getDate()}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{MONTHS[d.getMonth()].slice(0,3)}.</div>
                    </div>
                    <div style={{ fontSize:13 }}>{h.name}</div>
                  </div>
                );
              }) : (
                <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Aucun jour férié trouvé.</div>
              )}
            </div>
            <div style={{ padding:'12px 20px', background:'var(--amber-light)', borderTop:'1px solid var(--border)', borderRadius:'0 0 var(--radius-lg) var(--radius-lg)', fontSize:12, color:'var(--amber)' }}>
              Les jours fériés sont automatiquement exclus des calculs de forfait et des alertes de seuil.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
