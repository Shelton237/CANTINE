// Planning rotatif
// GET    /api/schedules?week_start=YYYY-MM-DD&canteen_id=...
// POST   /api/schedules       — upsert (employee_id, canteen_id, week_start, day_of_week)
// DELETE /api/schedules/:id

const router = require('express').Router();
const auth   = require('../middleware/auth');

// GET /api/schedules
router.get('/', auth, auth.roles('admin','drh','rcantine','employe','daf','dg'), async (req, res) => {
  const db = req.app.locals.db;
  const { week_start, canteen_id } = req.query;

  const ws = week_start || (() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().split('T')[0];
  })();

  let where = [`es.week_start = $1`], params = [ws], idx = 2;

  // Scoper à l'entreprise pour tous sauf admin
  if (req.user.role !== 'admin') {
    where.push(`e.company_id = $${idx++}`);
    params.push(req.user.company_id);
  }
  // L'employé ne voit que son propre planning
  if (req.user.role === 'employe') {
    // Trouver l'employee_id via l'email du user
    const { rows: empRows } = await db.query(
      `SELECT e.id FROM employees e JOIN users u ON u.email=e.email WHERE u.id=$1`, [req.user.id]
    );
    if (empRows[0]) {
      where.push(`es.employee_id = $${idx++}`);
      params.push(empRows[0].id);
    }
  }
  if (canteen_id) {
    where.push(`es.canteen_id = $${idx++}`);
    params.push(canteen_id);
  }

  try {
    const { rows } = await db.query(
      `SELECT es.*,
              e.first_name, e.last_name, e.matricule, e.department,
              s.name AS shift_name,
              ca.name AS canteen_name
       FROM employee_schedules es
       JOIN employees e  ON e.id  = es.employee_id
       JOIN canteens  ca ON ca.id = es.canteen_id
       LEFT JOIN shifts s ON s.id = e.shift_id
       WHERE ${where.join(' AND ')}
       ORDER BY e.last_name, e.first_name, es.day_of_week`,
      params
    );
    res.json({ week_start: ws, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedules — upsert
router.post('/', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  const { employee_id, canteen_id, week_start, day_of_week, is_free } = req.body;

  if (!employee_id || !week_start || !day_of_week)
    return res.status(400).json({ error: 'employee_id, week_start, day_of_week requis' });

  try {
    const { rows } = await db.query(
      `INSERT INTO employee_schedules (employee_id, canteen_id, week_start, day_of_week, is_free)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (employee_id, week_start, day_of_week)
       DO UPDATE SET canteen_id=$2, is_free=$5
       RETURNING *`,
      [employee_id, canteen_id||null, week_start, day_of_week, is_free||false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', auth, auth.roles('admin','drh'), async (req, res) => {
  try {
    await req.app.locals.db.query('DELETE FROM employee_schedules WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
