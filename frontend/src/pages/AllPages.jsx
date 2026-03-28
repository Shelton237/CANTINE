// ─── Canteens.jsx ─────────────────────────────────────────
import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export function Canteens() {
  const [canteens, setCanteens] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getCanteens().then(setCanteens); }, []);

  async function handleToggle(id) {
    const updated = await api.toggleCanteen(id);
    setCanteens(prev => prev.map(c => c.id === id ? { ...c, is_open: updated.is_open } : c));
  }

  async function handleAdd() {
    setSaving(true);
    try { await api.createCanteen(form); api.getCanteens().then(setCanteens); setModal(false); setForm({}); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Mes cantines</div>
        <div className="topbar-actions"><button className="btn primary" onClick={() => setModal(true)}>+ Ajouter</button></div>
      </div>
      <div className="content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {canteens.map(c => (
            <div key={c.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="av-lg" style={{ background: c.is_open ? 'var(--blue)' : 'var(--muted)' }}>{c.name?.[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.company_name} · {c.location || 'Emplacement non défini'}</div>
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 500 }}>{c.today_count || 0}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>repas aujourd'hui</div>
                  </div>
                  <span className={`badge ${c.is_open ? 'green' : 'gray'}`}>{c.is_open ? 'Ouverte' : 'Fermée'}</span>
                  <button className="btn sm" onClick={() => handleToggle(c.id)}>{c.is_open ? 'Fermer' : 'Ouvrir'}</button>
                </div>
              </div>
            </div>
          ))}
          {!canteens.length && <p style={{ color: 'var(--muted)' }}>Aucune cantine configurée.</p>}
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">Nouvelle cantine</div><button className="modal-close" onClick={() => setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="label">Nom</label><input className="input" value={form.name||''} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Cantine principale" /></div>
              <div className="form-group"><label className="label">Emplacement</label><input className="input" value={form.location||''} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="Bâtiment A – RDC" /></div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setModal(false)}>Annuler</button><button className="btn primary" onClick={handleAdd} disabled={saving}>{saving?'...':'Créer'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PrestDash.jsx ─────────────────────────────────────────
export function PrestDash() {
  const [canteens, setCanteens] = useState([]);
  useEffect(() => { api.myCanteens().then(setCanteens); }, []);

  const chartData = {
    labels: canteens.map(c => c.name),
    datasets: [{
      label: 'Repas aujourd\'hui',
      data: canteens.map(c => +(c.today_count||0)),
      backgroundColor: canteens.map((_,i) => ['rgba(26,86,219,0.8)','rgba(5,150,105,0.8)','rgba(217,119,6,0.8)','rgba(124,58,237,0.8)'][i%4]),
      borderRadius: 6,
    }],
  };
  const chartOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>`${ctx.raw} repas`}} },
    scales:{ x:{grid:{display:false},ticks:{font:{size:11}}}, y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:10}}} },
  };

  return (
    <>
      <div className="topbar"><div className="topbar-title">Vue d'ensemble</div><div className="topbar-actions"><div className="live-badge"><div className="live-dot"></div>En direct</div></div></div>
      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card blue"><div className="kpi-label">Cantines actives</div><div className="kpi-value">{canteens.filter(c=>c.is_open).length}</div></div>
          <div className="kpi-card"><div className="kpi-label">Repas aujourd'hui (total)</div><div className="kpi-value">{canteens.reduce((s,c)=>s+(+c.today_count||0),0)}</div></div>
          <div className="kpi-card"><div className="kpi-label">Contrats actifs</div><div className="kpi-value">{canteens.length}</div></div>
          <div className="kpi-card green"><div className="kpi-label">Statut service</div><div className="kpi-value green" style={{fontSize:16,marginTop:4}}>Opérationnel</div></div>
        </div>
        {canteens.length > 1 && (
          <div className="card" style={{marginBottom:16}}>
            <div className="card-head"><div className="card-title">Repas par cantine — aujourd'hui</div></div>
            <div style={{padding:'12px 20px',height:180}}>
              <Bar data={chartData} options={chartOpts} />
            </div>
          </div>
        )}
        <div className="card">
          <div className="card-head"><div className="card-title">Mes cantines</div></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {canteens.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="av-lg">{c.company_name?.[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.company_name} — {c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.location}</div>
                </div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 500 }}>{c.today_count||0}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>repas</div></div>
                <span className={`badge ${c.is_open ? 'green' : 'gray'}`}>{c.is_open ? 'Ouverte' : 'Fermée'}</span>
              </div>
            ))}
            {!canteens.length && <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Aucune cantine assignée</div>}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── PrestMenus.jsx ────────────────────────────────────────
export function PrestMenus() {
  const [menus,   setMenus]   = useState([]);
  const [canteens,setCanteens]= useState([]);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ menu_type:'standard', service_date: new Date().toISOString().split('T')[0] });
  const [saving,  setSaving]  = useState(false);
  const TYPE_BADGE = { standard:'blue', vegetarian:'green', premium:'amber' };
  const TYPE_LABEL = { standard:'Standard', vegetarian:'Végétarien', premium:'Premium' };

  useEffect(() => { api.myCanteens().then(list => { setCanteens(list); if(list[0]) api.getMenus(`canteen_id=${list[0].id}`).then(setMenus); }); }, []);

  async function handleSave() {
    setSaving(true);
    try { await api.createMenu(form); if(canteens[0]) api.getMenus(`canteen_id=${canteens[0].id}`).then(setMenus); setModal(false); setForm({ menu_type:'standard', service_date: new Date().toISOString().split('T')[0] }); }
    catch(err){ alert(err.message); } finally { setSaving(false); }
  }

  return (
    <>
      <div className="topbar"><div className="topbar-title">Gestion des menus</div><div className="topbar-actions"><button className="btn primary" onClick={() => setModal(true)}>+ Nouveau menu</button></div></div>
      <div className="content">
        <div className="card">
          <div className="card-head"><div className="card-title">Menus planifiés</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Plat</th><th>Description</th><th>Type</th><th>Portions</th><th></th></tr></thead>
              <tbody>
                {menus.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.service_date).toLocaleDateString('fr')}</td>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{m.description || '—'}</td>
                    <td><span className={`badge ${TYPE_BADGE[m.menu_type]||'gray'}`}>{TYPE_LABEL[m.menu_type]||m.menu_type}</span></td>
                    <td>{m.portions_planned}</td>
                    <td><button className="btn sm" style={{ color: 'var(--red)' }} onClick={() => api.deleteMenu(m.id).then(() => setMenus(prev=>prev.filter(x=>x.id!==m.id)))}>Suppr.</button></td>
                  </tr>
                ))}
                {!menus.length && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>Aucun menu planifié</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">Nouveau menu</div><button className="modal-close" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="label">Cantine</label><select className="input" value={form.canteen_id||''} onChange={e=>setForm(f=>({...f,canteen_id:e.target.value}))}><option value="">Sélectionner</option>{canteens.map(c=><option key={c.id} value={c.id}>{c.company_name} — {c.name}</option>)}</select></div>
              <div className="form-row">
                <div className="form-group"><label className="label">Date de service</label><input className="input" type="date" value={form.service_date} onChange={e=>setForm(f=>({...f,service_date:e.target.value}))}/></div>
                <div className="form-group"><label className="label">Type</label><select className="input" value={form.menu_type} onChange={e=>setForm(f=>({...f,menu_type:e.target.value}))}><option value="standard">Standard</option><option value="vegetarian">Végétarien</option><option value="premium">Premium</option></select></div>
              </div>
              <div className="form-group"><label className="label">Nom du plat</label><input className="input" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Romazava poulet"/></div>
              <div className="form-group"><label className="label">Description</label><input className="input" value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Bouillon, brèdes mafane..."/></div>
              <div className="form-group"><label className="label">Portions prévues</label><input className="input" type="number" value={form.portions_planned||''} onChange={e=>setForm(f=>({...f,portions_planned:+e.target.value}))} placeholder="150"/></div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={()=>setModal(false)}>Annuler</button><button className="btn primary" onClick={handleSave} disabled={saving}>{saving?'...':'Enregistrer'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PrestStaff.jsx ────────────────────────────────────────
export function PrestStaff() {
  const [staff,  setStaff]  = useState([]);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.myStaff().then(setStaff); }, []);
  async function handleSave() {
    setSaving(true);
    try { await api.createStaff(form); api.myStaff().then(setStaff); setModal(false); setForm({}); }
    catch(err){alert(err.message);} finally{setSaving(false);}
  }
  return (
    <>
      <div className="topbar"><div className="topbar-title">Personnel de cuisine</div><div className="topbar-actions"><button className="btn primary" onClick={()=>setModal(true)}>+ Ajouter agent</button></div></div>
      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-label">Total agents</div><div className="kpi-value">{staff.length}</div></div>
          <div className="kpi-card blue"><div className="kpi-label">En service</div><div className="kpi-value">{staff.filter(s=>s.status==='active').length}</div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Équipe</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Agent</th><th>Rôle</th><th>Shift</th><th>Statut</th></tr></thead>
              <tbody>
                {staff.map(s=>(
                  <tr key={s.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="av">{s.first_name?.[0]}{s.last_name?.[0]}</div>{s.first_name} {s.last_name}</div></td>
                    <td>{s.role||'—'}</td>
                    <td>{s.shift_name ? <span className="badge blue">{s.shift_name}</span> : '—'}</td>
                    <td><span className={`badge ${s.status==='active'?'green':'gray'}`}>{s.status==='active'?'En service':'Absent'}</span></td>
                  </tr>
                ))}
                {!staff.length && <tr><td colSpan={4} style={{textAlign:'center',color:'var(--muted)',padding:32}}>Aucun agent</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">Nouvel agent</div><button className="modal-close" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row"><div className="form-group"><label className="label">Prénom</label><input className="input" value={form.first_name||''} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))} /></div><div className="form-group"><label className="label">Nom</label><input className="input" value={form.last_name||''} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))} /></div></div>
              <div className="form-group"><label className="label">Rôle</label><input className="input" value={form.role||''} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Chef cuisinier" /></div>
              <div className="form-group"><label className="label">Shift</label><select className="input" value={form.shift_name||''} onChange={e=>setForm(f=>({...f,shift_name:e.target.value}))}><option value="">—</option><option>Matin</option><option>Midi</option><option>Soir</option><option>Nuit</option></select></div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={()=>setModal(false)}>Annuler</button><button className="btn primary" onClick={handleSave} disabled={saving}>{saving?'...':'Enregistrer'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PrestOrders.jsx ───────────────────────────────────────
export function PrestOrders() {
  const [orders, setOrders] = useState([]);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const STATUS_BADGE = { pending:'amber', confirmed:'blue', delivered:'green', cancelled:'red' };
  const STATUS_LABEL = { pending:'En attente', confirmed:'Confirmée', delivered:'Livrée', cancelled:'Annulée' };
  useEffect(() => { api.myOrders().then(setOrders); }, []);
  async function handleSave() {
    setSaving(true);
    try { await api.createOrder(form); api.myOrders().then(setOrders); setModal(false); setForm({}); }
    catch(err){alert(err.message);} finally{setSaving(false);}
  }
  return (
    <>
      <div className="topbar"><div className="topbar-title">Commandes fournisseurs</div><div className="topbar-actions"><button className="btn primary" onClick={()=>setModal(true)}>+ Nouvelle commande</button></div></div>
      <div className="content">
        <div className="card">
          <div className="card-head"><div className="card-title">Commandes en cours</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Fournisseur</th><th>Produits</th><th>Qté (kg)</th><th>Livraison</th><th>Montant (MGA)</th><th>Statut</th></tr></thead>
              <tbody>
                {orders.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontWeight:500}}>{o.supplier_name}</td>
                    <td style={{color:'var(--muted)',fontSize:12}}>{o.products||'—'}</td>
                    <td>{o.quantity_kg||'—'}</td>
                    <td>{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('fr') : '—'}</td>
                    <td>{o.amount_mga ? (+o.amount_mga).toLocaleString() : '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[o.status]||'gray'}`}>{STATUS_LABEL[o.status]||o.status}</span></td>
                  </tr>
                ))}
                {!orders.length && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:32}}>Aucune commande</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">Nouvelle commande</div><button className="modal-close" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="label">Fournisseur</label><input className="input" value={form.supplier_name||''} onChange={e=>setForm(f=>({...f,supplier_name:e.target.value}))} placeholder="Marché Anosibe" /></div>
              <div className="form-group"><label className="label">Produits</label><input className="input" value={form.products||''} onChange={e=>setForm(f=>({...f,products:e.target.value}))} placeholder="Légumes frais, brèdes..." /></div>
              <div className="form-row">
                <div className="form-group"><label className="label">Quantité (kg)</label><input className="input" type="number" value={form.quantity_kg||''} onChange={e=>setForm(f=>({...f,quantity_kg:e.target.value}))} /></div>
                <div className="form-group"><label className="label">Date livraison</label><input className="input" type="date" value={form.delivery_date||''} onChange={e=>setForm(f=>({...f,delivery_date:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label className="label">Montant (MGA)</label><input className="input" type="number" value={form.amount_mga||''} onChange={e=>setForm(f=>({...f,amount_mga:e.target.value}))} /></div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={()=>setModal(false)}>Annuler</button><button className="btn primary" onClick={handleSave} disabled={saving}>{saving?'...':'Enregistrer'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── AdminDash.jsx ─────────────────────────────────────────
export function AdminDash() {
  const [data, setData] = useState(null);
  useEffect(() => { api.platformReport().then(setData).catch(console.error); }, []);

  const companies = data?.companies || [];

  const barData = {
    labels: companies.map(c => c.name),
    datasets: [
      { label: 'Repas (mois)', data: companies.map(c=>+(c.checkins_month||0)), backgroundColor:'rgba(26,86,219,0.75)', borderRadius:4 },
      { label: 'Économies (k Ar)', data: companies.map(c=>Math.round((+c.savings_mga||0)/1000)), backgroundColor:'rgba(5,150,105,0.75)', borderRadius:4 },
    ],
  };
  const barOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'top',labels:{boxWidth:12,font:{size:11}}} },
    scales:{ x:{grid:{display:false},ticks:{font:{size:10}}}, y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:10}}} },
  };

  const pieData = {
    labels: companies.map(c=>c.name),
    datasets:[{
      data: companies.map(c=>+(c.checkins_month||0)),
      backgroundColor: ['rgba(26,86,219,0.8)','rgba(5,150,105,0.8)','rgba(217,119,6,0.8)','rgba(124,58,237,0.8)','rgba(220,38,38,0.7)','rgba(16,185,129,0.7)'],
      borderWidth: 2, borderColor: 'white',
    }],
  };
  const pieOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{position:'right',labels:{boxWidth:12,font:{size:11}}}, tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.raw} repas`}} },
  };

  return (
    <>
      <div className="topbar"><div className="topbar-title">Vue globale — Plateforme</div></div>
      <div className="content">
        {data && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card blue"><div className="kpi-label">Entreprises actives</div><div className="kpi-value">{companies.length}</div></div>
              <div className="kpi-card"><div className="kpi-label">Employés bénéficiaires</div><div className="kpi-value">{data.totals?.total_employees?.toLocaleString()||0}</div></div>
              <div className="kpi-card green"><div className="kpi-label">Économies totales</div><div className="kpi-value green">{data.totals?.savings_mga ? Math.round(data.totals.savings_mga/1000)+'K' : '—'}</div><div className="kpi-delta" style={{color:'var(--muted)'}}>MGA ce mois</div></div>
              <div className="kpi-card"><div className="kpi-label">Commissions dues</div><div className="kpi-value">{data.totals?.commission_mga ? Math.round(data.totals.commission_mga/1000)+'K' : '—'}</div><div className="kpi-delta" style={{color:'var(--muted)'}}>MGA ce mois</div></div>
            </div>

            {companies.length > 0 && (
              <div className="grid-6-4" style={{marginBottom:16}}>
                <div className="card">
                  <div className="card-head"><div className="card-title">Repas & économies par entreprise</div></div>
                  <div style={{padding:'12px 20px',height:220}}>
                    <Bar data={barData} options={barOpts} />
                  </div>
                </div>
                <div className="card">
                  <div className="card-head"><div className="card-title">Répartition des repas</div></div>
                  <div style={{padding:'12px 20px',height:220}}>
                    <Doughnut data={pieData} options={pieOpts} />
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-head"><div className="card-title">Toutes les entreprises</div></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Entreprise</th><th>Employés</th><th>Repas ce mois</th><th>Économies (MGA)</th><th>Commission (MGA)</th><th>Statut</th></tr></thead>
                  <tbody>
                    {companies.map(c=>(
                      <tr key={c.id}>
                        <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="av" style={{background:'var(--blue)'}}>{c.logo_initials||c.name?.[0]}</div><span style={{fontWeight:500}}>{c.name}</span></div></td>
                        <td>{(+c.employee_count).toLocaleString()}</td>
                        <td>{(+c.checkins_month).toLocaleString()}</td>
                        <td style={{color:'var(--green)',fontWeight:500}}>{(+c.savings_mga).toLocaleString()}</td>
                        <td style={{color:'var(--blue)',fontWeight:500}}>{(+c.commission_mga).toLocaleString()}</td>
                        <td><span className={`badge ${c.status==='active'?'green':c.status==='pilot'?'blue':'gray'}`}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {!data && <div style={{textAlign:'center',color:'var(--muted)',padding:60}}>Chargement…</div>}
      </div>
    </>
  );
}

// ─── AdminCompanies.jsx ────────────────────────────────────
export function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ commission_rate: 18, meal_price: 5000, status: 'pilot' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.getCompanies().then(setCompanies); }, []);
  async function handleSave() {
    setSaving(true);
    try { await api.createCompany(form); api.getCompanies().then(setCompanies); setModal(false); setForm({ commission_rate:18, meal_price:5000, status:'pilot' }); }
    catch(err){alert(err.message);} finally{setSaving(false);}
  }
  return (
    <>
      <div className="topbar"><div className="topbar-title">Gestion des entreprises</div><div className="topbar-actions"><button className="btn primary" onClick={()=>setModal(true)}>+ Nouvelle entreprise</button></div></div>
      <div className="content">
        <div className="card">
          <div className="card-head"><div className="card-title">Entreprises clientes — {companies.length}</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Entreprise</th><th>Employés</th><th>Cantines</th><th>Forfait/repas</th><th>Commission</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {companies.map(c=>(
                  <tr key={c.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="av">{c.logo_initials||c.name?.[0]}</div><div><div style={{fontWeight:500}}>{c.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{c.city}</div></div></div></td>
                    <td>{(+c.employee_count||0).toLocaleString()}</td>
                    <td>{c.canteen_count||0}</td>
                    <td>{(+c.meal_price).toLocaleString()} MGA</td>
                    <td>{c.commission_rate}%</td>
                    <td><span className={`badge ${c.status==='active'?'green':c.status==='pilot'?'blue':'gray'}`}>{c.status}</span></td>
                    <td><button className="btn sm">Voir</button></td>
                  </tr>
                ))}
                {!companies.length && <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:32}}>Aucune entreprise</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">Nouvelle entreprise</div><button className="modal-close" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="label">Nom</label><input className="input" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Orange Madagascar" /></div>
              <div className="form-row">
                <div className="form-group"><label className="label">Ville</label><input className="input" value={form.city||''} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="Antananarivo" /></div>
                <div className="form-group"><label className="label">Forfait mensuel (repas)</label><input className="input" type="number" value={form.monthly_quota||''} onChange={e=>setForm(f=>({...f,monthly_quota:+e.target.value}))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="label">Prix/repas (MGA)</label><input className="input" type="number" value={form.meal_price} onChange={e=>setForm(f=>({...f,meal_price:+e.target.value}))} /></div>
                <div className="form-group"><label className="label">Commission (%)</label><input className="input" type="number" value={form.commission_rate} onChange={e=>setForm(f=>({...f,commission_rate:+e.target.value}))} /></div>
              </div>
              <div className="form-group"><label className="label">Email contact</label><input className="input" type="email" value={form.contact_email||''} onChange={e=>setForm(f=>({...f,contact_email:e.target.value}))} /></div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={()=>setModal(false)}>Annuler</button><button className="btn primary" onClick={handleSave} disabled={saving}>{saving?'...':'Créer'}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── AdminProviders.jsx ────────────────────────────────────
export function AdminProviders() {
  const [providers, setProviders] = useState([]);
  useEffect(() => { api.getProviders().then(setProviders); }, []);
  return (
    <>
      <div className="topbar"><div className="topbar-title">Prestataires agréés</div><div className="topbar-actions"><button className="btn primary">+ Nouveau prestataire</button></div></div>
      <div className="content">
        <div className="card">
          <div className="card-head"><div className="card-title">Prestataires — {providers.length}</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Prestataire</th><th>Cantines</th><th>Contact</th><th>Téléphone</th><th>Statut</th></tr></thead>
              <tbody>
                {providers.map(p=>(
                  <tr key={p.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="av" style={{background:'var(--green)'}}>{p.name?.[0]}</div><span style={{fontWeight:500}}>{p.name}</span></div></td>
                    <td>{p.canteen_count||0}</td>
                    <td style={{color:'var(--blue)'}}>{p.contact_email||'—'}</td>
                    <td>{p.contact_phone||'—'}</td>
                    <td><span className={`badge ${p.status==='active'?'green':'gray'}`}>{p.status==='active'?'Agréé':'Inactif'}</span></td>
                  </tr>
                ))}
                {!providers.length && <tr><td colSpan={5} style={{textAlign:'center',color:'var(--muted)',padding:32}}>Aucun prestataire</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
