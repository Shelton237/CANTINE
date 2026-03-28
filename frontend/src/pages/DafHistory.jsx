import { useState, useEffect } from 'react';
import { api } from '../api';

export default function DafHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getInvoices()
      .then(res => setInvoices(Array.isArray(res) ? res : (res.data || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  const STATUS_COLORS = {
    pending: 'var(--amber)',
    validated: 'var(--blue)',
    paid: 'var(--green)',
    contested: 'var(--red)'
  };

  const STATUS_LABELS = {
    pending: 'En attente',
    validated: 'Validée',
    paid: 'Payée',
    contested: 'Contestée'
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Historique des Factures</div>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Toutes les factures (6 derniers mois)</div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Cantine / Prestataire</th>
                  <th>Forfait mensuel</th>
                  <th>Repas réels</th>
                  <th>Montant à payer</th>
                  <th>Commission CT</th>
                  <th>Économie nette</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="8" style={{textAlign:'center', padding:'1rem', color:'var(--muted)'}}>Aucun historique.</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{String(inv.month).padStart(2,'0')}/{inv.year}</td>
                    <td>{inv.canteen_name || `Cantine #${inv.canteen_id}`}{inv.provider_name ? ` (${inv.provider_name})` : ''}</td>
                    <td>{inv.forfait_mga?.toLocaleString() || 0} MGA</td>
                    <td>{inv.actual_checkins} repas</td>
                    <td><strong color="var(--blue)">{inv.actual_mga?.toLocaleString() || 0} MGA</strong></td>
                    <td>{inv.commission_mga?.toLocaleString() || 0} MGA</td>
                    <td style={{color:'var(--green)'}}>+{inv.net_savings_mga?.toLocaleString() || 0} MGA</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: STATUS_COLORS[inv.status], color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
