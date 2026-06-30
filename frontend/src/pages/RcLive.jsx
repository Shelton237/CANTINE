import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Line } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler);

export default function RcLive() {
  const { user } = useAuth();
  const [canteen, setCanteen] = useState(null);
  const [todayCount, setTodayCount] = useState({ approved: 0, rejected: 0 });
  const [liveScans, setLiveScans] = useState([]);
  const [queueEstimate, setQueueEstimate] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pour le graphique
  const [chartLabels, setChartLabels] = useState([]);
  const [chartDataCounts, setChartDataCounts] = useState([]);

  const fetchData = async (canteenId) => {
    try {
      const [countRes, liveRes, todayChecksRes] = await Promise.all([
        api.todayCount(canteenId),
        api.getLiveCheckins(canteenId),
        // On récupère les check-ins du jour complets pour le graphe
        api.getCheckins(`canteen_id=${canteenId}&date=${new Date().toISOString().split('T')[0]}&limit=1000`)
      ]);
      
      setTodayCount({ 
         approved: countRes.approved || 0,
         rejected: countRes.rejected || 0
      });
      setLiveScans(Array.isArray(liveRes) ? liveRes : liveRes.data || []);
      
      const allToday = Array.isArray(todayChecksRes) ? todayChecksRes : (todayChecksRes.data || []);
      
      // File d'attente estimée : nb scans validés dans les 5 dernières minutes * 2
      const fiveMinsAgo = new Date(Date.now() - 5 * 60000);
      const recentScans = allToday.filter(c => c.status === 'approved' && new Date(c.checked_at) >= fiveMinsAgo);
      setQueueEstimate(recentScans.length * 2);

      // Calcul des données du graphique (Groupement par 15min)
      const buckets = {};
      allToday.forEach(c => {
        if(c.status !== 'approved') return;
        const d = new Date(c.checked_at);
        // Ex: 11h45 -> 11:45
        const h = d.getHours();
        const m = Math.floor(d.getMinutes() / 15) * 15; 
        const label = `${String(h).padStart(2,'0')}h${String(m).padStart(2,'0')}`;
        buckets[label] = (buckets[label] || 0) + 1;
      });
      
      // Trier les labels chronologiquement
      const sortedLabels = Object.keys(buckets).sort();
      setChartLabels(sortedLabels);
      setChartDataCounts(sortedLabels.map(l => buckets[l]));

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // 1. Trouver la cantine associée
    api.getCanteens()
      .then(res => {
        const list = Array.isArray(res) ? res : res.data || [];
        if (list.length > 0) {
          const cid = list[0];
          setCanteen(cid);
          return fetchData(cid.id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Actualisation toutes les 30s
  useEffect(() => {
    if (!canteen) return;
    const interval = setInterval(() => {
      fetchData(canteen.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [canteen]);

  if (loading) return <div className="loading">Chargement Supervision Live...</div>;

  if (!canteen) {
    return <div className="content"><p style={{color:'var(--muted)'}}>Aucune cantine enregistrée pour votre entreprise.</p></div>;
  }

  const chartInfo = {
    labels: chartLabels.length ? chartLabels : ['En attente de donnees'],
    datasets: [
      {
        label: 'Flux de repas servis',
        data: chartDataCounts.length ? chartDataCounts : [0],
        borderColor: '#1a56db',
        backgroundColor: 'rgba(26, 86, 219, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      }
    ]
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">🔴 Supervision Live — {canteen.name}</div>
        <div className="topbar-actions">
           <span style={{ fontSize: '0.85rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--green)', animation: 'pulse 2s infinite' }}></div>
              En direct (Maj: 30s)
           </span>
        </div>
      </div>
      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-label">Repas servis (Aujourd'hui)</div>
            <div className="kpi-value">{todayCount.approved}</div>
          </div>
          <div className="kpi-card amber">
            <div className="kpi-label">File d'attente estimée</div>
            <div className="kpi-value">{queueEstimate} <span style={{fontSize:'1rem', color:'var(--muted)'}}>pers.</span></div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">Satisfaction Live</div>
            <div className="kpi-value">4.8 <span style={{fontSize:'1rem', color:'var(--muted)'}}>/ 5</span></div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-label">Refus d'accès</div>
            <div className="kpi-value">{todayCount.rejected}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          
          <div className="card">
            <div className="card-head">
              <div className="card-title">Flux du service en cours</div>
            </div>
            <div style={{ position: 'relative', height: 280, padding: '1rem' }}>
              <Line 
                data={chartInfo} 
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
                }} 
              />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Derniers Scans</div>
            </div>
            <div className="tbl-wrap" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="tbl">
                <tbody>
                  {liveScans.length === 0 ? (
                     <tr><td style={{textAlign:'center', color:'var(--muted)', padding:'2rem'}}>Aucun scan effectue recemment.</td></tr>
                  ) : liveScans.map((scan, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{fontWeight:600}}>{scan.first_name ? `${scan.first_name} ${scan.last_name}` : 'Inconnu'}</div>
                        <div style={{fontSize:'0.75rem', color:'var(--muted)'}}>
                          {new Date(scan.checked_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </div>
                      </td>
                      <td style={{textAlign:'right'}}>
                        {scan.status === 'approved' 
                           ? <span className="badge" style={{background:'var(--greenAlpha)', color:'var(--green)'}}>Validé</span>
                           : <span className="badge" style={{background:'var(--redAlpha)', color:'var(--red)'}}>Refusé</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(15, 122, 69, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(15, 122, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(15, 122, 69, 0); }
        }
      `}</style>
    </>
  );
}
