// GET /api/shifts          — tous les shifts DRH (toutes cantines de l'entreprise)
// PATCH /api/shifts/:id    — modifier un shift
// DELETE /api/shifts/:id   — supprimer un shift

const router = require('express').Router();
const auth   = require('../middleware/auth');

// GET /api/shifts
router.get('/', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  let where = '', params = [];
  if (req.user.role === 'drh') {
    where = 'WHERE ca.company_id=$1';
    params = [req.user.company_id];
  }
  const { rows } = await db.query(
    `SELECT s.*, ca.name AS canteen_name, ca.company_id,
            (SELECT COUNT(*) FROM employees e WHERE e.shift_id = s.id) AS employee_count
     FROM shifts s
     JOIN canteens ca ON ca.id = s.canteen_id
     ${where}
     ORDER BY ca.name, s.start_time`,
    params
  );
  res.json(rows);
});

// PATCH /api/shifts/:id
router.patch('/:id', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  const { name, start_time, end_time, tolerance_min, days_of_week } = req.body;
  const { rows } = await db.query(
    `UPDATE shifts
     SET name=$1, start_time=$2, end_time=$3,
         tolerance_min=COALESCE($4,tolerance_min),
         days_of_week=COALESCE($5,days_of_week)
     WHERE id=$6
     RETURNING *`,
    [name, start_time, end_time, tolerance_min||null, days_of_week||null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Shift introuvable' });
  res.json(rows[0]);
});

// DELETE /api/shifts/:id
router.delete('/:id', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  await db.query('DELETE FROM shifts WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
