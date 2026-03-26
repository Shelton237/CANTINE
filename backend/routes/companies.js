// ─── companies.js ─────────────────────────────────────────
const compRouter = require('express').Router();
const auth = require('../middleware/auth');

compRouter.get('/', auth, auth.roles('admin'), async (req, res) => {
  const { rows } = await req.app.locals.db.query(
    `SELECT co.*, COUNT(DISTINCT e.id) AS employee_count,
            COUNT(DISTINCT ca.id) AS canteen_count
     FROM companies co
     LEFT JOIN employees e  ON e.company_id=co.id AND e.status='active'
     LEFT JOIN canteens  ca ON ca.company_id=co.id
     GROUP BY co.id ORDER BY co.name`
  );
  res.json(rows);
});

compRouter.get('/:id', auth, async (req, res) => {
  const db = req.app.locals.db;
  if (req.user.role === 'drh' && req.user.company_id !== req.params.id)
    return res.status(403).json({ error: 'Accès interdit' });
  const { rows } = await db.query('SELECT * FROM companies WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Entreprise introuvable' });
  res.json(rows[0]);
});

compRouter.post('/', auth, auth.roles('admin'), async (req, res) => {
  const db = req.app.locals.db;
  const { name, logo_initials, address, city, contact_email, contact_phone,
          monthly_quota, meal_price, commission_rate, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const { rows } = await db.query(
    `INSERT INTO companies (name,logo_initials,address,city,contact_email,contact_phone,
                            monthly_quota,meal_price,commission_rate,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [name, logo_initials||name.substring(0,2).toUpperCase(), address||null, city||null,
     contact_email||null, contact_phone||null,
     monthly_quota||0, meal_price||5000, commission_rate||18, status||'pilot']
  );
  res.status(201).json(rows[0]);
});

compRouter.patch('/:id', auth, auth.roles('admin'), async (req, res) => {
  const db = req.app.locals.db;
  const fields = ['name','logo_initials','address','city','contact_email','contact_phone',
                  'monthly_quota','meal_price','commission_rate','status'];
  const sets = [], params = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { sets.push(`${f}=$${params.length+1}`); params.push(req.body[f]); }});
  if (!sets.length) return res.status(400).json({ error: 'Aucune donnée' });
  params.push(req.params.id);
  const { rows } = await db.query(
    `UPDATE companies SET ${sets.join(',')},updated_at=NOW() WHERE id=$${params.length} RETURNING *`, params
  );
  res.json(rows[0]);
});

module.exports = compRouter;
