// GET   /api/alerts              — alertes actives (DRH/admin)
// POST  /api/alerts              — créer une alerte (interne/admin)
// PATCH /api/alerts/:id/read     — marquer comme lue
// PATCH /api/alerts/read-all     — tout marquer lu

const router = require('express').Router();
const auth   = require('../middleware/auth');

// GET /api/alerts
router.get('/', auth, auth.roles('admin','drh','daf','dg','rcantine'), async (req, res) => {
  const db = req.app.locals.db;
  const { unread_only, limit = 50 } = req.query;

  let where = [], params = [], idx = 1;

  // Tous les rôles non-admin sont scopés à leur entreprise
  if (req.user.role !== 'admin') {
    where.push(`a.company_id = $${idx++}`);
    params.push(req.user.company_id);
  }
  if (unread_only === 'true') {
    where.push(`a.is_read = false`);
  }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const { rows } = await db.query(
    `SELECT a.*,
            e.first_name, e.last_name,
            ca.name AS canteen_name
     FROM alerts a
     LEFT JOIN employees e  ON e.id  = a.employee_id
     LEFT JOIN canteens  ca ON ca.id = a.canteen_id
     ${w}
     ORDER BY a.created_at DESC
     LIMIT $${idx}`,
    [...params, limit]
  );

  const { rows: counts } = await db.query(
    `SELECT COUNT(*) AS unread
     FROM alerts
     WHERE company_id=$1 AND is_read=false`,
    [req.user.company_id || null]
  );

  res.json({ data: rows, unread: parseInt(counts[0]?.unread || 0) });
});

// POST /api/alerts
router.post('/', auth, auth.roles('admin','drh','daf','dg','rcantine'), async (req, res) => {
  const db = req.app.locals.db;
  const { company_id, canteen_id, employee_id, type, severity, title, message } = req.body;
  const cid = req.user.role === 'drh' ? req.user.company_id : company_id;

  const { rows } = await db.query(
    `INSERT INTO alerts (company_id, canteen_id, employee_id, type, severity, title, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [cid, canteen_id||null, employee_id||null, type||'autre', severity||'info', title, message||null]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  const { rows } = await req.app.locals.db.query(
    'UPDATE alerts SET is_read=true WHERE id=$1 RETURNING *',
    [req.params.id]
  );
  res.json(rows[0]);
});

// PATCH /api/alerts/read-all
router.patch('/read-all', auth, auth.roles('admin','drh','daf','dg','rcantine'), async (req, res) => {
  const db = req.app.locals.db;
  await db.query(
    'UPDATE alerts SET is_read=true WHERE company_id=$1',
    [req.user.company_id]
  );
  res.json({ ok: true });
});

module.exports = router;
