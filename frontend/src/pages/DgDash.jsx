import { useState, useEffect } from 'react';
import { api } from '../api';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function DgDash() {
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
  const byCanteen = data?.by_canteen || [];

  // Chart: Économies (12 derniers mois)
  const barData = {
    labels: series.map(s => s.label),
    datasets: [
      {
        label: 'Économies générées (MGA)',
        data: series.map(s => s.savings),
        backgroundColor: '#0f7a45',
        borderRadius: 4,
      }
    ]
  };

  // Chart: Répartition cantines
  const colors = ['#1a56db', '#7c3aed', '#b45309', '#0f7a45', '#c0392b'];
  const pieData = {
    labels: byCanteen.map(c => c.canteen_name),
    datasets: [
      {
        data: byCanteen.map(c => c.checkins),
        backgroundColor: colors.slice(0, byCanteen.length),
        borderWidth: 0,
      }
    ]
  };

  const currentMonth = series[series.length - 1] || {};
  const roi = currentMonth.commission > 0 ? (currentMonth.savings / currentMonth.commission).toFixed(1) : 0;

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Tableau de Bord Direction Générale</div>
      </div>
      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-label">Repas distribués (mois)</div>
            <div className="kpi-value">{currentMonth.checkins?.toLocaleString()}</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">Économies (mois)</div>
            <div className="kpi-value">{currentMonth.savings?.toLocaleString()} MGA</div>
          </div>
          <div className="kpi-card purple">
            <div className="kpi-label">Coût Solution (mois)</div>
            <div className="kpi-value">{currentMonth.commission?.toLocaleString()} MGA</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-label">ROI (Éco / Coût CT)</div>
            <div className="kpi-value">x{roi}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Évolution des économies (12 mois)</div>
            </div>
            <div style={{ padding: '1rem', height: 250, position: 'relative' }}>
              <Bar 
                data={barData} 
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
                }} 
              />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Répartition Repas / Cantine</div>
            </div>
            <div style={{ padding: '1rem', height: 250, position: 'relative', display:'flex', justifyContent:'center' }}>
              {byCanteen.length > 0 ? (
                 <Doughnut 
                   data={pieData} 
                   options={{
                     responsive: true, maintainAspectRatio: false,
                     plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: {size: 10} } } }
                   }} 
                 />
              ) : (
                 <div style={{color:'var(--muted)', marginTop:'4rem'}}>Aucune donnée.</div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-head">
            <div className="card-title">Performances par cantine (Mois courant)</div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Cantine</th>
                  <th style={{textAlign:'right'}}>Repas servis</th>
                  <th style={{textAlign:'right'}}>Économies générées</th>
                </tr>
              </thead>
              <tbody>
                {byCanteen.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{display:'inline-block', width:10, height:10, borderRadius:'50%', backgroundColor: colors[i%colors.length], marginRight:'8px'}}></span>
                      {c.canteen_name}
                    </td>
                    <td style={{textAlign:'right'}}>{c.checkins?.toLocaleString()}</td>
                    <td style={{textAlign:'right', color:'var(--green)'}}>+{c.savings?.toLocaleString()} MGA</td>
                  </tr>
                ))}
                {byCanteen.length === 0 && (
                   <tr><td colSpan="3" style={{textAlign:'center', padding:'1rem', color:'var(--muted)'}}>Aucune cantine active.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
