import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Bar, Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Legend, Tooltip } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Legend, Tooltip);

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard(),
      api.getCheckins('limit=8'),
      api.monthlyReport(),
    ]).then(([s, c, r]) => {
      setStats(s);
      setCheckins(c.data || []);
      setReport(r);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  const daily = report?.daily_chart || [];
  const chartData = {
    labels: daily.map(d => new Date(d.day).toLocaleDateString('fr', { day: '2-digit', month: '2-digit' })),
    datasets: [
      { label: 'Repas réels', data: daily.map(d => d.count), backgroundColor: '#1a56db', borderRadius: 3, borderWidth: 0 },
      { label: 'Forfait/jour', data: daily.map(d => d.quota), type: 'line', borderColor: '#c0392b', borderWidth: 1.5, borderDash: [4,3], pointRadius: 0, fill: false },
    ],
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 9 } } }, y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 9 } } } },
  };

  const statusLabel = {
    approved: { label: 'Validé', cls: 'green' },
    refused_already_eaten: { label: 'Déjà mangé', cls: 'red' },
    refused_wrong_shift:   { label: 'Hors shift', cls: 'amber' },
    refused_suspended:     { label: 'Suspendu', cls: 'red' },
    refused_unknown:       { label: 'Inconnu', cls: 'gray' },
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Tableau de bord</div>
          <div className="topbar-sub">{new Date().toLocaleDateString('fr', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
        </div>
        <div className="topbar-actions">
          <div className="live-badge"><div className="live-dot"></div>En direct</div>
        </div>
      </div>

      <div className="content">
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-label">Repas servis aujourd'hui</div>
            <div className="kpi-value">{stats?.today_checkins ?? '—'}</div>
            <div className="kpi-delta">Temps réel</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Repas ce mois</div>
            <div className="kpi-value">{stats?.month_checkins?.toLocaleString() ?? '—'}</div>
            <div className="kpi-delta">sur {stats?.monthly_quota?.toLocaleString()} forfait</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Refus aujourd'hui</div>
            <div className="kpi-value red">{stats?.refused_today ?? 0}</div>
            <div className="kpi-delta">accès non autorisés</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">Économies ce mois</div>
            <div className="kpi-value green">{stats?.savings_mga ? Math.round(stats.savings_mga / 1000) + 'K' : '—'}</div>
            <div className="kpi-delta">MGA économisés</div>
          </div>
        </div>

        <div className="grid-6-4">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Consommation journalière</div>
            </div>
            <div className="card-body">
              <div style={{ position: 'relative', height: 200 }}>
                {daily.length > 0 ? <Bar data={chartData} options={chartOpts} /> : <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune donnée</p>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Par shift — ce mois</div>
            </div>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              {(report?.by_shift || []).map(s => (
                <div key={s.shift_name} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span>{s.shift_name || 'Non défini'}</span>
                    <span style={{ fontWeight: 500 }}>{parseInt(s.count).toLocaleString()}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(100, parseInt(s.count) / (report?.actual?.total || 1) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
              {!(report?.by_shift?.length) && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune donnée</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Derniers check-ins</div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr>
                <th>Employé</th><th>Heure</th><th>Méthode</th><th>Shift</th><th>Statut</th>
              </tr></thead>
              <tbody>
                {checkins.map(c => {
                  const s = statusLabel[c.status] || { label: c.status, cls: 'gray' };
                  const method = { qr: 'QR carte', pin: 'Code PIN', nfc: 'Badge NFC' }[c.access_method] || c.access_method;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="av">{(c.first_name?.[0]||'') + (c.last_name?.[0]||'')}</div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.department}</div>
                          </div>
                        </div>
                      </td>
                      <td>{new Date(c.checked_at).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td><span className={`badge ${c.access_method === 'qr' ? 'blue' : c.access_method === 'pin' ? 'amber' : 'gray'}`}>{method}</span></td>
                      <td>{c.shift_name || '—'}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  );
                })}
                {!checkins.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>Aucun check-in aujourd'hui</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
