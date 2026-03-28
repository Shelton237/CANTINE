import { useState, useEffect } from 'react';
import { api } from '../api';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function DafDash() {
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dafReport(),
      api.getInvoices('status=pending')
    ]).then(([reportData, invoicesData]) => {
      setData(reportData);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : (invoicesData.data || []));
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  const kpis = data?.kpis || {};
  const series = data?.series || [];

  const chartData = {
    labels: series.map(s => s.label),
    datasets: [
      {
        label: 'Dépenses réelles (MGA)',
        data: series.map(s => s.checkins * (data?.company?.meal_price || 0)),
        backgroundColor: '#1a56db',
        borderRadius: 3,
        type: 'bar',
        order: 2,
      },
      {
        label: 'Forfait (MGA)',
        data: series.map(s => s.quota * (data?.company?.meal_price || 0)),
        type: 'line',
        borderColor: '#c0392b',
        borderDash: [4, 3],
        pointRadius: 0,
        fill: false,
        order: 1,
      }
    ]
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 9 } } }
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Tableau de Bord DAF</div>
      </div>
      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-label">Dépenses réelles (mois courant)</div>
            <div className="kpi-value">{(kpis.checkins * (data?.company?.meal_price || 0)).toLocaleString()} MGA</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">Économies (mois courant)</div>
            <div className="kpi-value">{kpis.savings_mga?.toLocaleString()} MGA</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-label">Factures en attente</div>
            <div className="kpi-value">{kpis.pending_invoices || 0}</div>
          </div>
          <div className="kpi-card purple">
            <div className="kpi-label">Commission CT (mois courant)</div>
            <div className="kpi-value">{series[series.length - 1]?.commission?.toLocaleString()} MGA</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-head">
            <div className="card-title">Évolution des dépenses vs forfait (12 derniers mois)</div>
          </div>
          <div style={{ position: 'relative', height: 250, padding: '1rem' }}>
            <Bar data={chartData} options={chartOpts} />
          </div>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-head">
            <div className="card-title">Factures en attente d'action</div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Cantine / Prestataire</th>
                  <th>Montant Réel</th>
                  <th>Économie certifiée</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign:'center', padding:'1rem', color:'var(--muted)'}}>Aucune facture en attente.</td></tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id}>
                      <td>{String(inv.month).padStart(2,'0')}/{inv.year}</td>
                      <td>{inv.canteen_name || `Cantine #${inv.canteen_id}`}</td>
                      <td>{inv.actual_mga?.toLocaleString()} MGA</td>
                      <td style={{color:'var(--green)'}}>+{inv.savings_mga?.toLocaleString()} MGA</td>
                      <td>
                        <a href="/daf/factures" className="btn primary" style={{fontSize: '0.8rem', padding: '0.25rem 0.5rem'}}>Voir détail</a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
