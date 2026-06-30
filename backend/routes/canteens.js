// ─── canteens.js ──────────────────────────────────────────
const canRouter = require('express').Router();
const auth = require('../middleware/auth');

canRouter.get('/', auth, async (req, res) => {
  const db = req.app.locals.db;
  let where = '', params = [];
  // Scoper les cantines selon le rôle
  if (req.user.role === 'drh' || req.user.role === 'daf' || req.user.role === 'dg') {
    where = 'WHERE ca.company_id=$1'; params = [req.user.company_id];
  } else if (req.user.role === 'rcantine' && req.user.canteen_id) {
    where = 'WHERE ca.id=$1'; params = [req.user.canteen_id];
  }
  try {
    const { rows } = await db.query(
      `SELECT ca.*, co.name AS company_name,
              (SELECT COUNT(*) FROM checkins ci WHERE ci.canteen_id=ca.id AND DATE(ci.checked_at)=CURRENT_DATE AND ci.status='approved') AS today_count
       FROM canteens ca JOIN companies co ON co.id=ca.company_id
       ${where} ORDER BY co.name, ca.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

canRouter.post('/', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  const { name, location, company_id } = req.body;
  const cid = req.user.role === 'drh' ? req.user.company_id : company_id;
  if (!cid) return res.status(400).json({ error: 'company_id requis' });
  try {
    const { rows } = await db.query(
      'INSERT INTO canteens (company_id,name,location) VALUES ($1,$2,$3) RETURNING *',
      [cid, name, location||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

canRouter.patch('/:id/toggle', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  try {
    const { rows } = await db.query(
      'UPDATE canteens SET is_open=NOT is_open WHERE id=$1 RETURNING *', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Cantine introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

canRouter.get('/:id/shifts', auth, async (req, res) => {
  try {
    const { rows } = await req.app.locals.db.query(
      'SELECT * FROM shifts WHERE canteen_id=$1 ORDER BY start_time', [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

canRouter.post('/:id/shifts', auth, auth.roles('admin','drh'), async (req, res) => {
  const { name, start_time, end_time } = req.body;
  if (!name || !start_time || !end_time)
    return res.status(400).json({ error: 'name, start_time et end_time requis' });
  try {
    const { rows } = await req.app.locals.db.query(
      'INSERT INTO shifts (canteen_id,name,start_time,end_time) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, name, start_time, end_time]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = canRouter;
