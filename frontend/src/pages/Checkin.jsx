import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const RESULTS = {
  approved:              { type: 'ok',   msg: 'Accès autorisé — bon appétit !' },
  refused_already_eaten: { type: 'ko',   msg: 'Accès refusé — repas déjà pris aujourd\'hui' },
  refused_wrong_shift:   { type: 'warn', msg: 'Hors créneau horaire' },
  refused_suspended:     { type: 'ko',   msg: 'Accès refusé — compte suspendu' },
  refused_unknown:       { type: 'ko',   msg: 'Badge non reconnu' },
};

export default function Checkin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,       setTab]       = useState('qr');
  const [pin,       setPin]       = useState('');
  const [nfcInput,  setNfcInput]  = useState('');
  const [canteen,   setCanteen]   = useState(null);
  const [count,     setCount]     = useState(0);
  const [result,    setResult]    = useState(null);
  const [processing,setProcessing]= useState(false);
  const [clock,     setClock]     = useState('');

  useEffect(() => {
    api.getCanteens().then(list => {
      if (list[0]) { setCanteen(list[0]); api.todayCount(list[0].id).then(r => setCount(r.count)); }
    });
    function tick() { const n = new Date(); setClock(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`); }
    tick(); const t = setInterval(tick, 10000); return () => clearInterval(t);
  }, []);

  async function doCheckin(payload) {
    if (!canteen || processing) return;
    setProcessing(true);
    try {
      const res = await api.checkin({ ...payload, canteen_id: canteen.id, device_id: 'tablet-001' });
      setResult({ ...res, ...RESULTS[res.status] });
      if (res.status === 'approved') setCount(c => c + 1);
      setTimeout(() => { setResult(null); setPin(''); setProcessing(false); }, 4000);
    } catch (err) {
      setResult({ type: 'ko', msg: err.message, status: 'error', employee: null });
      setTimeout(() => { setResult(null); setProcessing(false); }, 3000);
    }
  }

  function pinPress(n) {
    if (pin.length >= 4) return;
    const next = pin + n;
    setPin(next);
    if (next.length === 4) setTimeout(() => doCheckin({ access_method: 'pin', pin: next }), 300);
  }

  function pinClear() { setPin(pin.slice(0,-1)); }

  // Simulate QR scan (in production: replace with real QR scanner library)
  function simulateQR(qr_code) { doCheckin({ access_method: 'qr', qr_code }); }

  const typeColors = { ok: { ring: '#0f7a45', bg: 'rgba(15,122,69,0.15)', av: '#185fa5' }, ko: { ring: '#c0392b', bg: 'rgba(192,57,43,0.12)', av: '#7a1a1a' }, warn: { ring: '#b45309', bg: 'rgba(180,83,9,0.12)', av: '#7a4a00' } };
  const tc = result ? (typeColors[result.type] || typeColors.ko) : null;

  return (
    <div className="tablet-screen">
      <div className="t-topbar">
        <div className="t-logo"><div className="t-dot"></div>CantineTrack</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {canteen && <span style={{ fontSize: 11, color: '#4285f4', background: 'rgba(66,133,244,0.12)', padding: '3px 10px', borderRadius: 20 }}>{canteen.name}</span>}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{clock}</span>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ fontSize: 10, padding: '3px 8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>Quitter</button>
        </div>
      </div>

      <div className="t-body">
        <div className="t-card">
          {!result ? (
            <>
              <div className="t-tabs">
                {['qr','pin','nfc'].map(t => (
                  <div key={t} className={`t-tab${tab===t?' active':''}`} onClick={() => { setTab(t); setPin(''); }}>
                    {t === 'qr' ? 'QR / Carte' : t === 'pin' ? 'Code PIN' : 'Badge NFC'}
                  </div>
                ))}
              </div>

              {tab === 'qr' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 160, height: 160, border: '2px solid rgba(66,133,244,0.4)', borderRadius: 12, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: '80%', height: 2, background: 'rgba(66,133,244,0.7)', animation: 'scanLine 2s ease-in-out infinite', top: '50%' }}></div>
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" opacity={0.15}>
                      <rect x="4" y="4" width="26" height="26" rx="3" stroke="white" strokeWidth="2.5"/><rect x="11" y="11" width="12" height="12" fill="white"/>
                      <rect x="42" y="4" width="26" height="26" rx="3" stroke="white" strokeWidth="2.5"/><rect x="49" y="11" width="12" height="12" fill="white"/>
                      <rect x="4" y="42" width="26" height="26" rx="3" stroke="white" strokeWidth="2.5"/><rect x="11" y="49" width="12" height="12" fill="white"/>
                    </svg>
                    <style>{`@keyframes scanLine{0%,100%{top:20%}50%{top:80%}}`}</style>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'white', marginBottom: 6 }}>Présentez votre carte cantine</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Approchez le QR code de votre carte</div>
                </div>
              )}

              {tab === 'pin' && (
                <div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 16 }}>Entrez votre code à 4 chiffres</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.25)', background: i < pin.length ? '#4285f4' : 'transparent', borderColor: i < pin.length ? '#4285f4' : 'rgba(255,255,255,0.25)' }}></div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                      <button key={n} onClick={() => pinPress(String(n))} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, fontSize: 17, fontWeight: 500, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>{n}</button>
                    ))}
                    <button onClick={pinClear} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>Eff.</button>
                    <button onClick={() => pinPress('0')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, fontSize: 17, fontWeight: 500, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>0</button>
                    <button onClick={() => pin.length===4 && doCheckin({ access_method:'pin', pin })} style={{ background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.3)', borderRadius: 10, padding: 14, fontSize: 12, color: '#85b7eb', cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                  </div>
                </div>
              )}

              {tab === 'nfc' && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ width: 90, height: 90, borderRadius: '50%', border: '2px solid rgba(29,158,117,0.3)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="8" width="24" height="18" rx="3" stroke="#5dcaa5" strokeWidth="1.5"/><path d="M12 17h8M16 14v6" stroke="#5dcaa5" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Approchez votre badge NFC</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>Tenez le badge à moins de 3 cm</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', border: `2px solid ${tc.ring}`, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {result.type === 'ok'
                  ? <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 16l5 5 11-10" stroke="#0f7a45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : result.type === 'warn'
                  ? <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M12 10v8M16 22v1" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round"/><path d="M4 26L16 6l12 20H4z" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" fill="none"/></svg>
                  : <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M10 10l12 12M22 10L10 22" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round"/></svg>
                }
              </div>
              {result.employee && (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: tc.av, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 500, color: 'white', margin: '0 auto 10px' }}>
                    {(result.employee.first_name?.[0]||'') + (result.employee.last_name?.[0]||'')}
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 500, color: 'white', marginBottom: 3 }}>{result.employee.first_name} {result.employee.last_name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{result.employee.department} · {result.employee.shift_name || '—'}</div>
                </>
              )}
              <div style={{ fontSize: 13, padding: '10px 16px', borderRadius: 10, marginBottom: 14, background: result.type==='ok' ? 'rgba(15,122,69,0.12)' : result.type==='warn' ? 'rgba(180,83,9,0.1)' : 'rgba(192,57,43,0.1)', color: result.type==='ok' ? '#5dcaa5' : result.type==='warn' ? '#fac775' : '#f09595' }}>
                {result.msg || result.message}
              </div>
              {result.checkin && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Enregistré · {new Date(result.checkin.checked_at).toLocaleTimeString('fr')}</div>}
              <div style={{ marginTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>Retour automatique dans 4s</div>
            </div>
          )}
        </div>
      </div>

      <div className="t-sim-bar">
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '5px 0' }}>Simuler :</span>
        <button className="t-sim-btn" onClick={() => simulateQR('QR-DEMO-OK')}>Accès validé</button>
        <button className="t-sim-btn" onClick={() => simulateQR('QR-DEMO-EATEN')}>Déjà mangé</button>
        <button className="t-sim-btn" onClick={() => simulateQR('QR-DEMO-SHIFT')}>Hors horaire</button>
        <button className="t-sim-btn" onClick={() => simulateQR('QR-INCONNU-123')}>Badge inconnu</button>
      </div>

      <div className="t-footer">
        <span>{canteen?.name || 'Cantine'}</span>
        <span>{count} repas servis aujourd'hui</span>
      </div>
    </div>
  );
}
