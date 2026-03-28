import { useState, useEffect } from 'react';
import { api } from '../api';

export default function DgComparatif() {
  const [canteens, setCanteens] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Charger les cantines de l'entreprise (DG voit coller à son company_id)
    api.getCanteens()
      .then(async (res) => {
        const cList = Array.isArray(res) ? res : res.data || [];
        setCanteens(cList);
        
        // 2. Charger le monthly report de chacune pr comparer
        const repData = {};
        await Promise.all(
          cList.map(c => 
            api.monthlyReport(`canteen_id=${c.id}`)
               .then(r => { repData[c.id] = r; })
               .catch(() => { repData[c.id] = null; })
          )
        );
        setReports(repData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Chargement du comparatif...</div>;

  // Calcul du champion (meilleure éco)
  let championId = null;
  let maxSavings = -1;
  Object.keys(reports).forEach(cid => {
    if (reports[cid]?.savings?.mga > maxSavings) {
      maxSavings = reports[cid].savings.mga;
      championId = parseInt(cid);
    }
  });

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Comparatif Inter-Cantines</div>
      </div>
      <div className="content">
        
        {canteens.length === 0 ? (
           <div className="card" style={{padding: '2rem', textAlign: 'center', color: 'var(--muted)'}}>
             Aucune cantine enregistrée pour le moment.
           </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {canteens.map(c => {
              const r = reports[c.id];
              if(!r) return <div key={c.id} className="card p-4">Chargement {c.name}...</div>;
              
              const actual = r.actual?.total || 0;
              const quota = r.quota?.monthly || 1;
              const usagePct = quota > 0 ? Math.round((actual / quota) * 100) : 0;
              const isOver = usagePct > 90;
              const isChampion = championId === c.id && maxSavings > 0;
              
              const roi = r.commission?.mga > 0 ? (r.savings?.mga / r.commission.mga).toFixed(1) : 0;

              return (
                <div key={c.id} className="card" style={{ border: isChampion ? '2px solid var(--blue)' : isOver ? '2px solid var(--red)' : 'none', position: 'relative' }}>
                  
                  {isChampion && (
                    <div style={{ position: 'absolute', top: '-12px', right: 16, background: 'var(--blue)', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                       🏆 Champion Économies
                    </div>
                  )}
                  {isOver && !isChampion && (
                    <div style={{ position: 'absolute', top: '-12px', right: 16, background: 'var(--red)', color: '#fff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                       ⚠️ À surveiller
                    </div>
                  )}

                  <div className="card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem' }}>
                    <div className="card-title" style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                       {c.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Ouverture : {c.opening_time} - {c.closing_time} <br/>
                      {c.status === 'open' ? <span style={{color:'var(--green)'}}>Service Actif</span> : <span style={{color:'var(--red)'}}>Fermée</span>}
                    </div>
                  </div>
                  
                  <div className="card-body" style={{ padding: '1.5rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.2rem' }}>
                      <div>
                        <div style={{ fontSize:'0.8rem', color:'var(--muted)' }}>Repas / Jour (moyen)</div>
                        <div style={{ fontSize:'1.2rem', fontWeight:'600' }}>{r.actual?.daily_avg || 0}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'0.8rem', color:'var(--muted)' }}>Forfait / Jour</div>
                        <div style={{ fontSize:'1.2rem', fontWeight:'600' }}>{r.quota?.daily || 0}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.2rem' }}>
                       <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem', marginBottom:'6px' }}>
                         <span>Consommation Forfait Mensuel</span>
                         <span style={{ fontWeight: 600, color: usagePct > 100 ? 'var(--red)' : usagePct > 80 ? 'var(--amber)' : 'inherit' }}>{usagePct}%</span>
                       </div>
                       <div style={{ width: '100%', background: 'var(--surface-dark, #e2e8f0)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(usagePct, 100)}%`, background: isOver ? 'var(--red)' : 'var(--blue)', height: '100%' }}></div>
                       </div>
                    </div>

                    <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                        <span style={{ fontSize:'0.85rem', color:'var(--muted)' }}>Économie Mensuelle</span>
                        <span style={{ fontWeight: 600, color: 'var(--green)' }}>+{r.savings?.mga?.toLocaleString()} Ar</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:'0.85rem', color:'var(--muted)' }}>Commission CantineTrack</span>
                        <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{r.commission?.mga?.toLocaleString()} Ar</span>
                      </div>
                    </div>
                    
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'0.8rem', borderTop:'1px dashed var(--border)' }}>
                       <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                         <span style={{ fontSize:'1.2rem' }}>⭐</span>
                         <div>
                            <div style={{ fontSize:'0.85rem', fontWeight:'600' }}>4.8 / 5</div>
                            <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>Satisfaction</div>
                         </div>
                       </div>
                       <div style={{ textAlign:'right' }}>
                         <div style={{ fontSize:'1.1rem', fontWeight:'700', color:'var(--green)' }}>x{roi}</div>
                         <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>ROI Client</div>
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
