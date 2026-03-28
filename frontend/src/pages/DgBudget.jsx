import { useState, useEffect } from 'react';
import { api } from '../api';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DgBudget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dgReport()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  const kpis = data?.kpis || {};
  const series = data?.series || [];
  
  // Isoler l'année courante 
  const currentYear = new Date().getFullYear();
  const yearData = series.filter(s => s.year === currentYear);
  const elapsedMonths = yearData.length;
  
  const totalActualBudget = yearData.reduce((acc, curr) => acc + (curr.checkins * (data.company?.meal_price || 0)), 0);
  const totalCommission = yearData.reduce((acc, curr) => acc + curr.commission, 0);
  const totalSavings = yearData.reduce((acc, curr) => acc + curr.savings, 0);

  const avgMonthlyActual = elapsedMonths > 0 ? totalActualBudget / elapsedMonths : 0;
  const avgMonthlySavings = elapsedMonths > 0 ? totalSavings / elapsedMonths : 0;
  const avgMonthlyComm = elapsedMonths > 0 ? totalCommission / elapsedMonths : 0;

  const remainingMonths = 12 - elapsedMonths;
  const projectedTotal = totalActualBudget + (avgMonthlyActual * remainingMonths);
  const projectedSavingsTotal = totalSavings + (avgMonthlySavings * remainingMonths);
  
  const companyQuotaMga = (data?.company?.monthly_quota || 0) * (data?.company?.meal_price || 0);
  const annualForfait = companyQuotaMga * 12;

  const chartData = {
    labels: ['Réalisé YTD', 'Projeté EOY', 'Budget Initial (Forfait)'],
    datasets: [
      {
        label: 'Dépenses Cantine (MGA)',
        data: [totalActualBudget, projectedTotal, annualForfait],
        backgroundColor: ['#1a56db', '#cbd5e1', '#c0392b'],
        borderRadius: 4
      }
    ]
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  const usagePct = annualForfait > 0 ? Math.round((projectedTotal / annualForfait) * 100) : 0;

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Analyse Budgétaire & Projections {currentYear}</div>
      </div>
      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-label">Dépenses YTD</div>
            <div className="kpi-value">{totalActualBudget.toLocaleString()} MGA</div>
          </div>
          <div className="kpi-card gray">
            <div className="kpi-label">Projection annuelle (EOY)</div>
            <div className="kpi-value">{projectedTotal.toLocaleString()} MGA</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">Économies projetées</div>
            <div className="kpi-value">+{projectedSavingsTotal.toLocaleString()} MGA</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-label">Utilisation Budget</div>
            <div className="kpi-value">{usagePct}%</div>
          </div>
        </div>

        {usagePct > 90 && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--redAlpha)', borderLeft: '4px solid var(--red)', borderRadius: '4px' }}>
            <h4 style={{ margin: 0, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Alerte de Dépassement Budgétaire
            </h4>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Le rythme de consommation actuel indique une projection à {usagePct}% de votre forfait d'engagement annuel. Une renégociation avec les prestataires ou un durcissement des règles d'accès est recommandé.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Projection des Dépenses vs Budget Forfaitaire</div>
            </div>
            <div style={{ padding: '1rem', height: 250, position: 'relative' }}>
              <Bar data={chartData} options={chartOpts} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Répartition Globale du Budget Réalisé</div>
            </div>
            <div className="card-body" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Paiements Prestataires (Repas réels)</span>
                  <span style={{ fontWeight: 600 }}>{((totalActualBudget / (totalActualBudget + totalCommission)) * 100 || 0).toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', backgroundColor: 'var(--surface-dark, #eee)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${(totalActualBudget / (totalActualBudget + totalCommission)) * 100}%`, backgroundColor: 'var(--blue)', height: '100%' }}></div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Commissions Solution CantineTrack</span>
                  <span style={{ fontWeight: 600 }}>{((totalCommission / (totalActualBudget + totalCommission)) * 100 || 0).toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', backgroundColor: 'var(--surface-dark, #eee)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${(totalCommission / (totalActualBudget + totalCommission)) * 100}%`, backgroundColor: 'var(--purple)', height: '100%' }}></div>
                </div>
              </div>
              
              <hr style={{opacity: 0.1, margin: '2rem 0'}}/>
              
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem', backgroundColor:'var(--greenAlpha)', border:'1px solid var(--green)', borderRadius:'8px' }}>
                <div>
                  <div style={{fontSize:'0.85rem', color:'var(--green)'}}>Retour sur Investissement Annuel cumulé</div>
                  <div style={{fontSize:'1.8rem', fontWeight:700, color:'var(--green)'}}>x{totalCommission > 0 ? (totalSavings/totalCommission).toFixed(1) : 0}</div>
                </div>
                <div style={{textAlign:'right', fontSize:'0.85rem'}}>
                  <div>Coût généré: {totalCommission.toLocaleString()} MGA</div>
                  <div>Éco. générée: <strong>{totalSavings.toLocaleString()} MGA</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
