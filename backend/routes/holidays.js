// GET /api/holidays?year=2026
const router = require('express').Router();
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const db = req.app.locals.db;
  const year = req.query.year || new Date().getFullYear();
  try {
    const { rows } = await db.query(
      `SELECT * FROM holidays
       WHERE EXTRACT(YEAR FROM date) = $1
       ORDER BY date`,
      [year]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
