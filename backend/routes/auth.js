const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });

  const db = req.app.locals.db;
  try {
    const { rows } = await db.query(
      `SELECT u.*, c.name AS company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role,
        company_id: user.company_id, provider_id: user.provider_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id, email: user.email, role: user.role,
        first_name: user.first_name, last_name: user.last_name,
        company_id: user.company_id, company_name: user.company_name,
        provider_id: user.provider_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.role, u.first_name, u.last_name,
            u.company_id, c.name AS company_name, u.provider_id
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(rows[0]);
});

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Champs requis manquants' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'Mot de passe trop court (min 8 car.)' });

  const db = req.app.locals.db;
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const valid = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

  const hash = await bcrypt.hash(new_password, 10);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  res.json({ message: 'Mot de passe mis à jour' });
});

module.exports = router;
