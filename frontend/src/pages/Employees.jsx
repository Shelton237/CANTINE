import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_BADGE = { active: 'green', suspended: 'red', inactive: 'gray' };
const STATUS_LABEL = { active: 'Actif', suspended: 'Suspendu', inactive: 'Inactif' };
const METHOD_LABEL = { qr: 'QR carte', pin: 'Code PIN', nfc: 'Badge NFC' };
const METHOD_BADGE = { qr: 'blue', pin: 'amber', nfc: 'gray' };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [shifts,    setShifts]    = useState([]);
  const [canteens,  setCanteens]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | 'add' | employee object
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState({});

  useEffect(() => {
    api.getCanteens().then(list => {
      setCanteens(list);
      if (list[0]) api.getShifts(list[0].id).then(setShifts);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 15 });
    if (search) params.set('search', search);
    api.getEmployees(params.toString())
      .then(r => { setEmployees(r.data); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [search, page]);

  function openAdd() {
    setForm({ status: 'active', access_method: 'qr' });
    setModal('add');
  }
  function openEdit(emp) {
    setForm({ ...emp, pin: '' });
    setModal(emp);
  }
  function closeModal() { setModal(null); setForm({}); }

  async function handleSave() {
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.createEmployee(form);
      } else {
        await api.updateEmployee(modal.id, form);
      }
      closeModal();
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      api.getEmployees(params.toString()).then(r => { setEmployees(r.data); setTotal(r.total); });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Désactiver cet employé ?')) return;
    await api.deleteEmployee(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  }

  const totalPages = Math.ceil(total / 15);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Gestion des employés</div>
          <div className="topbar-sub">{total} employés</div>
        </div>
        <div className="topbar-actions">
          <div className="search-bar" style={{ width: 220 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn primary" onClick={openAdd}>+ Ajouter</button>
        </div>
      </div>

      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-label">Total</div><div className="kpi-value">{total}</div></div>
          <div className="kpi-card blue"><div className="kpi-label">Actifs</div><div className="kpi-value">{employees.filter(e => e.status==='active').length}</div></div>
          <div className="kpi-card red"><div className="kpi-label">Suspendus</div><div className="kpi-value red">{employees.filter(e => e.status==='suspended').length}</div></div>
          <div className="kpi-card"><div className="kpi-label">Page actuelle</div><div className="kpi-value">{page}/{totalPages||1}</div></div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Liste des employés</div></div>
          {loading
            ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Chargement...</div>
            : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr>
                    <th>Employé</th><th>Matricule</th><th>Service</th><th>Shift</th><th>Méthode</th><th>Dernier repas</th><th>Statut</th><th></th>
                  </tr></thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="av">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{emp.first_name} {emp.last_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><code style={{ fontSize: 11, background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{emp.matricule}</code></td>
                        <td>{emp.department || '—'}</td>
                        <td>{emp.shift_name ? <span className="badge blue">{emp.shift_name}</span> : '—'}</td>
                        <td><span className={`badge ${METHOD_BADGE[emp.access_method]||'gray'}`}>{METHOD_LABEL[emp.access_method]||emp.access_method}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {emp.last_checkin ? new Date(emp.last_checkin).toLocaleDateString('fr') : 'Jamais'}
                        </td>
                        <td><span className={`badge ${STATUS_BADGE[emp.status]||'gray'}`}>{STATUS_LABEL[emp.status]||emp.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn sm" onClick={() => openEdit(emp)}>Modifier</button>
                            <button className="btn sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(emp.id)}>Désactiver</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!employees.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>Aucun employé trouvé</td></tr>}
                  </tbody>
                </table>
              </div>
            )
          }
          <div className="pagination">
            <span>Affichage {Math.min((page-1)*15+1, total)}–{Math.min(page*15, total)} sur {total}</span>
            <div className="page-btns">
              <button className="btn sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>←</button>
              <button className="btn sm" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages}>→</button>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">{modal==='add' ? 'Ajouter un employé' : `Modifier — ${modal.first_name} ${modal.last_name}`}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Prénom</label>
                  <input className="input" value={form.first_name||''} onChange={e => setForm(f=>({...f,first_name:e.target.value}))} placeholder="Andry" />
                </div>
                <div className="form-group">
                  <label className="label">Nom</label>
                  <input className="input" value={form.last_name||''} onChange={e => setForm(f=>({...f,last_name:e.target.value}))} placeholder="Rakoto" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email||''} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="andry@entreprise.mg" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Service</label>
                  <input className="input" value={form.department||''} onChange={e => setForm(f=>({...f,department:e.target.value}))} placeholder="Service client" />
                </div>
                <div className="form-group">
                  <label className="label">Shift autorisé</label>
                  <select className="input" value={form.shift_id||''} onChange={e => setForm(f=>({...f,shift_id:e.target.value}))}>
                    <option value="">— Sélectionner —</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="label">Méthode d'accès</label>
                  <select className="input" value={form.access_method||'qr'} onChange={e => setForm(f=>({...f,access_method:e.target.value}))}>
                    <option value="qr">QR code (carte)</option>
                    <option value="pin">Code PIN</option>
                    <option value="nfc">Badge NFC</option>
                  </select>
                </div>
                {form.access_method === 'pin' && (
                  <div className="form-group">
                    <label className="label">Code PIN (4 chiffres)</label>
                    <input className="input" type="password" maxLength={4} value={form.pin||''} onChange={e => setForm(f=>({...f,pin:e.target.value}))} placeholder="••••" />
                  </div>
                )}
              </div>
              {modal !== 'add' && (
                <div className="form-group">
                  <label className="label">Statut</label>
                  <select className="input" value={form.status||'active'} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
