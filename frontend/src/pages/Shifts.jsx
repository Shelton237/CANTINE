import { useState, useEffect } from 'react';
import { api } from '../api';

const SHIFT_COLORS = ['blue', 'green', 'amber', 'gray'];
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const emptyForm = { name: '', start_time: '06:00', end_time: '11:30', tolerance_min: 15, days_of_week: [1,2,3,4,5], canteen_id: '' };

export default function Shifts() {
  const [shifts,    setShifts]    = useState([]);
  const [canteens,  setCanteens]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal,     setModal]     = useState(null);
  const [editShift, setEditShift] = useState(null);
  const [form,      setForm]      = useState(emptyForm);
  const [assignForm,setAssignForm]= useState({ employee_id: '', shift_id: '' });
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([api.getAllShifts(), api.getCanteens(), api.getEmployees()])
      .then(([s, c, e]) => {
        setShifts(s);
        setCanteens(c);
        setEmployees(e.data || e);
      });
  }, []);

  function reload() {
    Promise.all([api.getAllShifts(), api.getEmployees()])
      .then(([s, e]) => { setShifts(s); setEmployees(e.data || e); });
  }

  function toggleDay(d) {
    setForm(f => {
      const days = f.days_of_week || [];
      return { ...f, days_of_week: days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort() };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.createShift(form.canteen_id, { name: form.name, start_time: form.start_time, end_time: form.end_time, tolerance_min: form.tolerance_min, days_of_week: form.days_of_week });
      } else {
        await api.updateShift(editShift.id, { name: form.name, start_time: form.start_time, end_time: form.end_time, tolerance_min: form.tolerance_min, days_of_week: form.days_of_week });
      }
      reload(); setModal(null);
    } catch(err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le shift "${editShift.name}" ?`)) return;
    await api.deleteShift(editShift.id);
    reload(); setModal(null);
  }

  async function handleAssign() {
    setSaving(true);
    try {
      await api.updateEmployee(assignForm.employee_id, { shift_id: assignForm.shift_id });
      reload(); setModal(null);
    } catch(err) { alert(err.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Configuration des shifts</div>
          <div className="topbar-sub">{shifts.length} créneaux actifs</div>
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => { setForm({ ...emptyForm, canteen_id: canteens[0]?.id||'' }); setEditShift(null); setModal('add'); }}>+ Nouveau shift</button>
        </div>
      </div>

      <div className="content">
        <div style={{ background:'var(--blue-light)', border:'1px solid rgba(26,86,219,0.15)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:20, fontSize:12, color:'#1a3a8a' }}>
          Double validation anti-fraude : la tablette vérifie (1) l'heure dans le créneau ET (2) l'employé assigné à cette cantine aujourd'hui (planning rotatif).
        </div>

        {canteens.map(ca => {
          const cShifts = shifts.filter(s => s.canteen_id === ca.id);
          if (!cShifts.length) return null;
          return (
            <div key={ca.id} className="mb16">
              <div style={{ fontSize:11, fontWeight:500, color:'var(--muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{ca.name}</div>
              <div className="grid-2">
                {cShifts.map((s, i) => (
                  <div key={s.id} className="card" style={{ borderLeft:`3px solid var(--${SHIFT_COLORS[i%4]})` }}>
                    <div style={{ padding:'16px 18px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div style={{ fontWeight:500 }}>{s.name}</div>
                        <span className={`badge ${SHIFT_COLORS[i%4]}`}>{s.employee_count||0} emp.</span>
                      </div>
                      <div style={{ fontSize:13, color:'var(--ink2)', marginBottom:4 }}>{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</div>
                      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>
                        Tolérance : {s.tolerance_min||15} min
                        {s.days_of_week && ` · ${s.days_of_week.map(d => DAYS[d-1]).join(', ')}`}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn sm" onClick={() => { setEditShift(s); setForm({ name:s.name, start_time:s.start_time, end_time:s.end_time, tolerance_min:s.tolerance_min||15, days_of_week:s.days_of_week||[1,2,3,4,5], canteen_id:s.canteen_id }); setModal('edit'); }}>Modifier</button>
                        <button className="btn sm" onClick={() => { setEditShift(s); setAssignForm({ employee_id:'', shift_id:s.id }); setModal('assign'); }}>Assigner</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!shifts.length && <div className="card" style={{ padding:40, textAlign:'center', color:'var(--muted)' }}>Aucun shift configuré — cliquez sur "+ Nouveau shift".</div>}
      </div>

      {/* Modal Add / Edit */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">{modal==='add' ? 'Configurer un shift' : `Modifier — ${editShift?.name}`}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="label">Nom du shift</label><input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Shift Matin" /></div>
              <div className="form-row">
                <div className="form-group"><label className="label">Heure début</label><input className="input" type="time" value={form.start_time} onChange={e => setForm(f=>({...f,start_time:e.target.value}))} /></div>
                <div className="form-group"><label className="label">Heure fin</label><input className="input" type="time" value={form.end_time} onChange={e => setForm(f=>({...f,end_time:e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Tolérance (min)</label><input className="input" type="number" min={0} max={60} value={form.tolerance_min} onChange={e => setForm(f=>({...f,tolerance_min:+e.target.value}))} /></div>
                {modal==='add' && <div className="form-group"><label className="label">Cantine</label><select className="input" value={form.canteen_id} onChange={e=>setForm(f=>({...f,canteen_id:e.target.value}))}>{canteens.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
              </div>
              <div className="form-group">
                <label className="label">Jours actifs</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                  {DAYS.map((d,i) => {
                    const active = (form.days_of_week||[]).includes(i+1);
                    return <button key={d} type="button" onClick={() => toggleDay(i+1)} style={{ padding:'4px 10px', borderRadius:20, fontSize:12, border:'1px solid var(--border2)', background:active?'var(--blue)':'transparent', color:active?'white':'var(--muted)', cursor:'pointer' }}>{d}</button>;
                  })}
                </div>
              </div>
            </div>
            <div className="modal-foot">
              {modal==='edit' && <button className="btn danger" onClick={handleDelete}>Supprimer</button>}
              <button className="btn" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn primary" onClick={handleSave} disabled={saving}>{saving?'...':'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assigner */}
      {modal === 'assign' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Assigner — {editShift?.name}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">Employé</label>
                <select className="input" value={assignForm.employee_id} onChange={e=>setAssignForm(f=>({...f,employee_id:e.target.value}))}>
                  <option value="">Sélectionner un employé</option>
                  {employees.map(emp=><option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} — {emp.matricule}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Shift</label>
                <select className="input" value={assignForm.shift_id} onChange={e=>setAssignForm(f=>({...f,shift_id:e.target.value}))}>
                  {shifts.map(s=><option key={s.id} value={s.id}>{s.name} ({s.canteen_name})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn primary" onClick={handleAssign} disabled={saving||!assignForm.employee_id}>{saving?'...':'Assigner'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
