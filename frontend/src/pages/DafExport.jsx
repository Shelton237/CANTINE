import { useState, useEffect } from 'react';
import { api } from '../api';

export default function DafExport() {
  const [periodStr, setPeriodStr] = useState('');
  const [format, setFormat] = useState('csv');
  const [cols, setCols] = useState({ matricule: true, nb_repas: true, departement: true, code_analytique: false });
  const [generating, setGenerating] = useState(false);
  
  // Aperçu state
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const d = new Date();
    setPeriodStr(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }, []);

  useEffect(() => {
    if(!periodStr) return;
    setLoadingPreview(true);
    // On récupère les checkins du mois pour faire l'aperçu
    api.getCheckins(`limit=500&date=${periodStr}`)
      .then(res => {
         const data = res.data || [];
         
         // Agrégation par employé
         const agg = {};
         data.forEach(c => {
            const eName = c.employee_name || `Emp #${c.employee_id}`;
            const eId   = c.employee_id;
            const dept  = c.department || 'Général';
            
            if(!agg[eId]) {
              agg[eId] = { id: eId, name: eName, department: dept, count: 0 };
            }
            if(c.status === 'approved') {
              agg[eId].count += 1;
            }
         });
         
         const arr = Object.values(agg).filter(x => x.count > 0);
         setPreview(arr);
      })
      .catch(console.error)
      .finally(() => setLoadingPreview(false));
  }, [periodStr]);

  const handleExport = () => {
    setGenerating(true);
    try {
      const parts = periodStr.split('-');
      if(parts.length < 2) throw new Error("Format de période");
      const [y, m] = parts;

      let csvContent = "";
      
      const header = [];
      if(cols.matricule) header.push("Matricule");
      header.push("Nom");
      if(cols.departement) header.push("Département");
      if(cols.code_analytique) header.push("Code_Analytique");
      if(cols.nb_repas) header.push("Repas_Consommes");
      header.push("Montant_A_Deduire");
      
      if(format === 'sage100') {
        csvContent += "CODE_JOURNAL;DATE;NB_PIECE;REF;COMPTE_GEN;COMPTE_TIERS;LIBELLE;DEBIT;CREDIT\n";
      } else {
        csvContent += header.join(";") + "\n";
      }

      preview.forEach(emp => {
        const totalAmount = emp.count * 2000; // exemple: déduction employé = 2000 MGA par repas
        
        if(format === 'sage100') {
           csvContent += `PAIE;31${String(m).padStart(2,'0')}${y.slice(2)};PCAN;CAN_${emp.id};641000;${emp.id};Repas Cantine - ${emp.name};${totalAmount};0\n`;
        } else {
           const row = [];
           if(cols.matricule) row.push(emp.id);
           row.push(emp.name);
           if(cols.departement) row.push(emp.department);
           if(cols.code_analytique) row.push(`ANA-${emp.department.substring(0,3).toUpperCase()}`);
           if(cols.nb_repas) row.push(emp.count);
           row.push(totalAmount);
           csvContent += row.join(";") + "\n";
        }
      });

      const blob = new Blob([csvContent], { type: format === 'excel' ? 'application/vnd.ms-excel;' : 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Export_Cantine_${format}_${periodStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) {
      alert("Erreur lors de l'export: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Export Comptabilité / Paie (DAF)</div>
      </div>
      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          
          <div className="card">
            <div className="card-head">
              <div className="card-title">Configuration</div>
            </div>
            <div className="card-body" style={{ padding: '1.5rem' }}>
               <div style={{ marginBottom: '1.5rem' }}>
                 <label className="label">Période (Mois)</label>
                 <input type="month" className="input" value={periodStr} onChange={(e) => setPeriodStr(e.target.value)} style={{ width: '100%' }} />
               </div>
               
               <div style={{ marginBottom: '1.5rem' }}>
                 <label className="label">Format CSV</label>
                 <select className="input" value={format} onChange={(e) => setFormat(e.target.value)} style={{ width: '100%' }}>
                   <option value="csv">CSV Standard (RH)</option>
                   <option value="sage100">Format Sage 100/Compta</option>
                   <option value="excel">Excel (séparateur point-virgule)</option>
                 </select>
               </div>

               {format !== 'sage100' && (
                 <div style={{ padding: '1rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <label className="label">Colonnes à inclure :</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.8rem' }}>
                      <label style={{display:'flex', alignItems:'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="checkbox" checked={cols.matricule} onChange={(e) => setCols({...cols, matricule: e.target.checked})} />
                        Matricule employé
                      </label>
                      <label style={{display:'flex', alignItems:'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="checkbox" checked={cols.nb_repas} onChange={(e) => setCols({...cols, nb_repas: e.target.checked})} />
                        Nb de repas pris
                      </label>
                      <label style={{display:'flex', alignItems:'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="checkbox" checked={cols.departement} onChange={(e) => setCols({...cols, departement: e.target.checked})} />
                        Département
                      </label>
                      <label style={{display:'flex', alignItems:'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="checkbox" checked={cols.code_analytique} onChange={(e) => setCols({...cols, code_analytique: e.target.checked})} />
                        Code analytique
                      </label>
                    </div>
                 </div>
               )}

               <button className="btn primary" onClick={handleExport} disabled={generating || preview.length === 0} style={{ width: '100%', padding: '0.75rem' }}>
                 {generating ? 'Génération...' : '📥 Télécharger l\'export'}
               </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Aperçu des données ({preview.length} employés)</div>
            </div>
            <div className="tbl-wrap">
              {loadingPreview ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)'}}>Chargement de l'aperçu...</div>
              ) : preview.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)'}}>Aucune donnée pour cette période.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      {cols.matricule && <th>Matricule</th>}
                      <th>Employé</th>
                      {cols.departement && <th>Départ.</th>}
                      {cols.nb_repas && <th style={{textAlign:'right'}}>Repas</th>}
                      <th style={{textAlign:'right'}}>Déductible estimé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map(emp => (
                      <tr key={emp.id}>
                        {cols.matricule && <td style={{fontSize:'0.85em', color:'var(--muted)'}}>{emp.id.substring(0,8)}</td>}
                        <td>{emp.name}</td>
                        {cols.departement && <td>{emp.department}</td>}
                        {cols.nb_repas && <td style={{textAlign:'right'}}><strong>{emp.count}</strong></td>}
                        <td style={{textAlign:'right', color:'var(--red)'}}>-{(emp.count * 2000).toLocaleString()} MGA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {preview.length > 10 && <div style={{padding: '0.5rem 1rem', fontSize:'0.85em', color:'var(--muted)', textAlign:'center', background:'var(--surface)'}}>Aperçu limité aux 10 premiers résultats...</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
