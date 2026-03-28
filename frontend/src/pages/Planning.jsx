import { useState, useEffect } from 'react';
import { api } from '../api';

const DAYS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getMondayOf(date) {
  const d = new Date(date); const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1); return d.toISOString().split('T')[0];
}
function addDays(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
}
function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr', { day:'2-digit', month:'2-digit' });
}
function getWeekNum(dateStr) {
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay()+6)%7);
  const w1 = new Date(d.getFullYear(),0,4);
  return 1 + Math.round(((d-w1)/86400000 - 3 + (w1.getDay()+6)%7)/7);
}

export default function Planning() {
  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [canteens,  setCanteens]  = useState([]);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState({ employee_id:'', canteen_id:'', day_of_week:1, is_free:false });
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([api.getEmployees(), api.getCanteens()])
      .then(([e, c]) => { setEmployees(e.data||e); setCanteens(c); });
  }, []);

  useEffect(() => {
    api.getSchedules(`week_start=${weekStart}`).then(r => setSchedules(r.data||[]));
  }, [weekStart]);

  function reload() {
    api.getSchedules(`week_start=${weekStart}`).then(r => setSchedules(r.data||[]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.upsertSchedule({ ...form, week_start: weekStart, canteen_id: form.is_free ? null : form.canteen_id });
      reload(); setModal(false);
    } catch(err) { alert(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id) { await api.deleteSchedule(id); reload(); }

  const empMap = {};
  schedules.forEach(s => {
    if (!empMap[s.employee_id]) empMap[s.employee_id] = { employee_id:s.employee_id, first_name:s.first_name, last_name:s.last_name, shift_name:s.shift_name, days:{} };
    empMap[s.employee_id].days[s.day_of_week] = { canteen_name:s.canteen_name, is_free:s.is_free, id:s.id };
  });
  const rows = Object.values(empMap);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Planning rotatif — Semaine {getWeekNum(weekStart)}</div>
          <div className="topbar-sub">{fmtDate(weekStart)} – {fmtDate(addDays(weekStart,6))} · {rows.length} employés planifiés</div>
        </div>
        <div className="topbar-actions">
          <button className="btn sm" onClick={() => setWeekStart(addDays(weekStart,-7))}>← Préc.</button>
          <button className="btn sm" onClick={() => setWeekStart(getMondayOf(new Date()))}>Cette semaine</button>
          <button className="btn sm" onClick={() => setWeekStart(addDays(weekStart,7))}>Suiv. →</button>
          <button className="btn primary" onClick={() => { setForm({ employee_id:'', canteen_id:canteens[0]?.id||'', day_of_week:1, is_free:false }); setModal(true); }}>+ Assigner</button>
        </div>
      </div>
      <div className="content">
        <div style={{ background:'var(--blue-light)', border:'1px solid rgba(26,86,219,0.15)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:20, fontSize:12, color:'#1a3a8a' }}>
          Le planning rotatif définit quelle cantine est autorisée chaque jour pour chaque employé. La tablette refuse le scan si l'employé n'est pas assigné à cette cantine aujourd'hui.
        </div>
        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ minWidth:180 }}>Employé</th>
                  {DAYS_LABELS.map((d,i) => <th key={d}>{d} <span style={{ fontWeight:400, color:'var(--muted)' }}>{fmtDate(addDays(weekStart,i))}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(emp => (
                  <tr key={emp.employee_id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="av">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>
                        <div>
                          <div style={{ fontWeight:500, fontSize:12 }}>{emp.first_name} {emp.last_name}</div>
                          {emp.shift_name && <span className="badge blue" style={{ fontSize:10 }}>{emp.shift_name}</span>}
                        </div>
                      </div>
                    </td>
                    {[1,2,3,4,5,6,7].map(d => {
                      const entry = emp.days[d];
                      return (
                        <td key={d} style={{ padding:'8px 12px' }}>
                          {entry ? (
                            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                              {entry.is_free ? <span className="badge gray">Libre</span> : <span className="badge blue" style={{ fontSize:10 }}>{entry.canteen_name||'—'}</span>}
                              <button onClick={() => handleDelete(entry.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:14 }}>×</button>
                            </div>
                          ) : <span style={{ color:'var(--muted)', fontSize:11 }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>Aucun planning pour cette semaine.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">Assigner un employé</div><button className="modal-close" onClick={() => setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="label">Employé</label><select className="input" value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))}><option value="">Sélectionner</option>{employees.map(emp=><option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} — {emp.matricule}</option>)}</select></div>
              <div className="form-row">
                <div className="form-group"><label className="label">Jour</label><select className="input" value={form.day_of_week} onChange={e=>setForm(f=>({...f,day_of_week:+e.target.value}))}>{DAYS_LABELS.map((d,i)=><option key={d} value={i+1}>{d} {fmtDate(addDays(weekStart,i))}</option>)}</select></div>
                <div className="form-group"><label className="label">Cantine</label><select className="input" value={form.canteen_id} onChange={e=>setForm(f=>({...f,canteen_id:e.target.value}))} disabled={form.is_free}>{canteens.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="checkbox" id="is_free" checked={form.is_free} onChange={e=>setForm(f=>({...f,is_free:e.target.checked}))} />
                <label htmlFor="is_free" style={{ fontSize:13, cursor:'pointer' }}>Choix libre ce jour</label>
              </div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setModal(false)}>Annuler</button><button className="btn primary" onClick={handleSave} disabled={saving||!form.employee_id}>{saving?'...':'Assigner'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
