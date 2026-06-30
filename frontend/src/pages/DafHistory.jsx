import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_BADGE = {
  pending:   'amber',
  validated: 'blue',
  paid:      'green',
  contested: 'red',
};

const STATUS_LABELS = {
  pending:   'En attente',
  validated: 'Validée',
  paid:      'Payée',
  contested: 'Contestée',
};

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

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Historique des Factures</div>
      </div>
      <div className="content">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Toutes les factures (12 derniers mois)</div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Prestataire / Cantine</th>
                  <th>Repas réels</th>
                  <th>Montant payé</th>
                  <th>Commission CT</th>
                  <th>Économies nettes</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="7" style={{textAlign:'center', padding:'1rem', color:'var(--muted)'}}>Aucun historique.</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{String(inv.month).padStart(2,'0')}/{inv.year}</td>
                    <td>
                      {inv.provider_name ? <span style={{fontWeight:500}}>{inv.provider_name}</span> : '—'}
                      {inv.canteen_name ? <div style={{fontSize:11,color:'var(--muted)'}}>{inv.canteen_name}</div> : null}
                    </td>
                    <td>{inv.actual_checkins ?? '—'} repas</td>
                    <td><strong style={{color:'var(--blue)'}}>{(inv.actual_mga || 0).toLocaleString()} MGA</strong></td>
                    <td>{(inv.commission_mga || 0).toLocaleString()} MGA</td>
                    <td style={{color:'var(--green)',fontWeight:500}}>+{(inv.net_savings_mga || 0).toLocaleString()} MGA</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[inv.status] || 'gray'}`}>
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
