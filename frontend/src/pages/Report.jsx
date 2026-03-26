import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Report() {
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    setLoading(true);
    api.monthlyReport(new URLSearchParams({ year, month }).toString())
      .then(setReport).catch(console.error).finally(() => setLoading(false));
  }, [year, month]);

  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  if (loading) return <div className="loading">Chargement...</div>;

  const r = report;
  const pct = r?.quota?.monthly > 0 ? Math.round(r.actual.total / r.quota.monthly * 100) : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Rapport mensuel</div>
          <div className="topbar-sub">{r?.company?.name}</div>
        </div>
        <div className="topbar-actions">
          <select className="input" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }} value={month} onChange={e => setMonth(+e.target.value)}>
            {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="input" style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn primary" onClick={() => window.print()}>Exporter PDF</button>
        </div>
      </div>

      <div className="content">
        {!r ? <p style={{ color: 'var(--muted)' }}>Aucune donnée pour cette période.</p> : (
          <>
            <div className="eco-banner">
              <div>
                <div className="eco-label">Économies générées</div>
                <div className="eco-big">{r.savings.mga.toLocaleString()} MGA</div>
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>
                  ≈ {Math.round(r.savings.mga / 4350).toLocaleString()} USD économisés
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500, marginBottom: 4 }}>Taux d'écart</div>
                <div style={{ fontSize: 32, fontWeight: 500, color: '#073a20' }}>{r.savings.rate}%</div>
                <div style={{ fontSize: 11, color: 'var(--green)' }}>sous le forfait contractuel</div>
              </div>
            </div>

            <div className="commission-strip">
              <div>
                <div style={{ fontSize: 12, color: '#1a3a8a', fontWeight: 500 }}>
                  Commission CantineTrack — {r.commission.rate}% des économies
                </div>
                <div style={{ fontSize: 11, color: '#4a6abf', marginTop: 3 }}>
                  Facture émise le 01/{String(month+1).padStart(2,'0')}/{year}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#0e2a7a' }}>{r.commission.mga.toLocaleString()} MGA</div>
                <div style={{ fontSize: 11, color: '#4a6abf', marginTop: 2 }}>≈ {Math.round(r.commission.mga/4350).toLocaleString()} USD</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-head"><div className="card-title">Forfait vs consommation réelle</div></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ padding: 14, borderRadius: 8, borderLeft: '3px solid var(--red)', border: '1px solid var(--border)', borderLeftWidth: 3 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Forfait contractuel</div>
                      <div style={{ fontSize: 20, fontWeight: 500 }}>{r.quota.monthly.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>repas / mois</div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 8, borderLeft: '3px solid var(--green)', border: '1px solid var(--border)', borderLeftWidth: 3 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Repas réels tracés</div>
                      <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--green)' }}>{r.actual.total.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>repas ce mois</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Taux de consommation</div>
                  <div className="progress-track" style={{ marginBottom: 5 }}>
                    <div className="progress-fill green" style={{ width: `${pct}%` }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                    <span>0</span><span>{pct}% consommé</span><span>Forfait max</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title">Par shift</div></div>
                <div className="card-body" style={{ padding: '8px 20px' }}>
                  {(r.by_shift || []).map(s => (
                    <div key={s.shift_name} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                        <span>{s.shift_name || 'Non défini'}</span>
                        <span style={{ fontWeight: 500 }}>{parseInt(s.count).toLocaleString()}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.min(100, parseInt(s.count) / r.actual.total * 100)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-title">Détail semaine par semaine</div></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr>
                    <th>Semaine</th><th>Forfait</th><th>Réel</th><th>Écart</th><th>Économie (MGA)</th><th>Taux</th>
                  </tr></thead>
                  <tbody>
                    {(r.by_week || []).map((w, i) => (
                      <tr key={i}>
                        <td>S{i+1}</td>
                        <td>{w.quota.toLocaleString()}</td>
                        <td>{w.actual.toLocaleString()}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 500 }}>-{(w.quota-w.actual).toLocaleString()}</td>
                        <td style={{ color: 'var(--green)', fontWeight: 500 }}>{w.savings.toLocaleString()}</td>
                        <td><span className="badge green">{w.quota > 0 ? Math.round((w.quota-w.actual)/w.quota*100) : 0}%</span></td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 500, background: 'var(--bg)' }}>
                      <td>Total</td>
                      <td>{r.quota.monthly.toLocaleString()}</td>
                      <td>{r.actual.total.toLocaleString()}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 700 }}>-{(r.quota.monthly - r.actual.total).toLocaleString()}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 700 }}>{r.savings.mga.toLocaleString()}</td>
                      <td><span className="badge green">{r.savings.rate}%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
