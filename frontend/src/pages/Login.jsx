import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      const map = { drh: '/dashboard', tablette: '/checkin', prestataire: '/prestataire', admin: '/admin' };
      navigate(map[user.role] || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const demos = [
    { label: 'DRH',         email: 'drh@telma.mg',            role: 'drh' },
    { label: 'Prestataire',  email: 'prestataire@restopro.mg', role: 'prestataire' },
    { label: 'Tablette',     email: 'tablette@telma.mg',       role: 'tablette' },
    { label: 'Admin',        email: 'admin@cantinetrack.mg',   role: 'admin' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'var(--blue)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white', margin: '0 auto 16px' }}>C</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>CantineTrack</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Connectez-vous à votre espace</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.mg" required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Mot de passe</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>{error}</div>}
            <button className="btn primary" type="submit" style={{ width: '100%', padding: 10 }} disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10, textAlign: 'center' }}>Comptes de démonstration</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {demos.map(d => (
                <button key={d.role} className="btn sm" style={{ textAlign: 'left', fontSize: 11 }}
                  onClick={() => { setEmail(d.email); setPassword('password123'); }}>
                  {d.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>Mot de passe démo : password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
