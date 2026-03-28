import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS = {
  approved:              { label: 'Validé',       cls: 'green' },
  refused_already_eaten: { label: 'Déjà mangé',   cls: 'red'   },
  refused_wrong_shift:   { label: 'Hors shift',   cls: 'amber' },
  refused_suspended:     { label: 'Suspendu',     cls: 'red'   },
  refused_unknown:       { label: 'Inconnu',      cls: 'gray'  },
};
const METHOD = { qr: 'QR carte', pin: 'Code PIN', nfc: 'Badge NFC' };

export default function CheckinHistory() {
  const [checkins, setCheckins] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [filters,  setFilters]  = useState({ status: '', date: '' });
  const [loading,  setLoading]  = useState(false);
  const LIMIT = 25;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (filters.status) params.set('status', filters.status);
    if (filters.date)   params.set('date', filters.date);
    api.getCheckins(params.toString())
      .then(r => { setCheckins(r.data||[]); setTotal(r.total||0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filters]);

  function handleExport() {
    const headers = ['Employé','Matricule','Date','Heure','Cantine','Shift','Méthode','Statut'];
    const rows = checkins.map(c => [
      `${c.first_name} ${c.last_name}`, c.matricule,
      new Date(c.checked_at).toLocaleDateString('fr'),
      new Date(c.checked_at).toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' }),
      c.canteen_name, c.shift_name||'', METHOD[c.access_method]||c.access_method,
      STATUS[c.status]?.label||c.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = `checkins_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Historique check-ins</div>
          <div className="topbar-sub">Toutes cantines · {total.toLocaleString()} scans</div>
        </div>
        <div className="topbar-actions">
          <button className="btn" onClick={handleExport}>Export CSV</button>
        </div>
      </div>

      <div className="content">
        {/* Filtres */}
        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
          <select className="input" style={{ width:'auto' }} value={filters.status} onChange={e => { setFilters(f=>({...f,status:e.target.value})); setPage(1); }}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input className="input" type="date" style={{ width:'auto' }} value={filters.date} onChange={e => { setFilters(f=>({...f,date:e.target.value})); setPage(1); }} />
          {(filters.status||filters.date) && <button className="btn sm" onClick={() => { setFilters({ status:'', date:'' }); setPage(1); }}>Réinitialiser</button>}
        </div>

        <div className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Employé</th><th>Date / Heure</th><th>Cantine</th><th>Shift</th><th>Méthode</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>Chargement...</td></tr>
                ) : checkins.map(c => {
                  const s = STATUS[c.status] || { label:c.status, cls:'gray' };
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="av">{(c.first_name?.[0]||'')+(c.last_name?.[0]||'')}</div>
                          <div>
                            <div style={{ fontWeight:500 }}>{c.first_name} {c.last_name}</div>
                            <div style={{ fontSize:11, color:'var(--muted)' }}>{c.matricule}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{new Date(c.checked_at).toLocaleDateString('fr')}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{new Date(c.checked_at).toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' })}</div>
                      </td>
                      <td>{c.canteen_name}</td>
                      <td>{c.shift_name ? <span className="badge blue">{c.shift_name}</span> : '—'}</td>
                      <td><span className={`badge ${c.access_method==='qr'?'blue':c.access_method==='pin'?'amber':'gray'}`}>{METHOD[c.access_method]||c.access_method}</span></td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  );
                })}
                {!loading && !checkins.length && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>Aucun check-in trouvé</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <span>Page {page} / {totalPages}</span>
              <div className="page-btns">
                <button className="btn sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Préc.</button>
                <button className="btn sm" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Suiv. →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
