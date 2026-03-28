import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function DafInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadInvoices = () => {
    setLoading(true);
    api.getInvoices('status=pending')
      .then(res => setInvoices(Array.isArray(res) ? res : (res.data || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleAction = (action) => {
    if(!modal) return;
    setSaving(true);
    const req = action === 'validate' 
      ? api.validateInvoice(modal.id, { notes })
      : api.contestInvoice(modal.id, { notes });
      
    req.then(() => {
      setModal(null);
      setNotes('');
      loadInvoices();
    }).catch(alert).finally(() => setSaving(false));
  };

  const handleGenerate = () => {
    const d = new Date();
    const payload = { year: d.getFullYear(), month: d.getMonth() + 1 };
    if (user?.role === 'daf') payload.company_id = user.company_id;
    
    api.generateInvoices(payload)
      .then(() => loadInvoices())
      .catch(err => alert("Erreur génération: " + err.message));
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Validation Factures</div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={handleGenerate}>Générer mois courant</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Factures en attente</div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cantine</th>
                  <th>Période</th>
                  <th>Forfait</th>
                  <th>Réel (scans)</th>
                  <th>Économie</th>
                  <th>Commission CT</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="7" style={{textAlign:'center', padding:'1rem', color:'var(--muted)'}}>Aucune facture en attente.</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.canteen_name || `Cantine #${inv.canteen_id}`}</td>
                    <td>{String(inv.month).padStart(2,'0')}/{inv.year}</td>
                    <td>{inv.forfait_mga?.toLocaleString() || 0} MGA</td>
                    <td>{inv.actual_mga?.toLocaleString() || 0} MGA</td>
                    <td style={{color:'var(--green)'}}>+{inv.savings_mga?.toLocaleString() || 0} MGA</td>
                    <td>{inv.commission_mga?.toLocaleString() || 0} MGA</td>
                    <td>
                      <button className="btn primary" style={{fontSize:'0.8rem', padding:'0.25rem 0.6rem'}} onClick={() => { setModal(inv); setNotes(''); }}>Traiter</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-head">
              <div className="modal-title">Traitement de facture</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Période:</strong> {String(modal.month).padStart(2,'0')}/{modal.year}</p>
              <p><strong>Cantine:</strong> {modal.canteen_name || `Cantine #${modal.canteen_id}`}</p>
              <br/>
              <p><strong>Repas scannés (réels) :</strong> {modal.actual_checkins}</p>
              <p><strong>Forfait d'engagement :</strong> {modal.forfait_mga?.toLocaleString()} MGA</p>
              <p><strong>Dépenses réelles à régler :</strong> <strong style={{color:'var(--blue)'}}>{modal.actual_mga?.toLocaleString()} MGA</strong></p>
              <hr style={{opacity:0.2, margin:'1rem 0'}}/>
              <p style={{color:'var(--green)'}}><strong>Économie pour l'entreprise :</strong> +{modal.savings_mga?.toLocaleString()} MGA</p>
              <p style={{color:'var(--purple)'}}><strong>Commission USRA-CARE (8%) :</strong> {modal.commission_mga?.toLocaleString()} MGA</p>
              <p><strong>Économie nette finale :</strong> <strong style={{color:'var(--green)'}}>{modal.net_savings_mga?.toLocaleString()} MGA</strong></p>
              
              <div style={{ marginTop: '1rem' }}>
                <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem', color:'var(--muted)'}}>Commentaire (uniquement si contestation) :</label>
                <textarea 
                  className="input" 
                  rows="3" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Expliquez pourquoi le montant calculé est incorrect..."
                />
              </div>
            </div>
            <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn red" disabled={saving || !notes.trim()} title={!notes.trim() ? "Veuillez saisir un commentaire pour contester" : ""} onClick={() => handleAction('contest')}>
                ⚠️ Contester
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" onClick={() => setModal(null)}>Annuler</button>
                <button className="btn primary" disabled={saving} onClick={() => handleAction('validate')}>
                  {saving ? '...' : '✅ Valider pour paiement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
