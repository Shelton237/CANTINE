// ─── menus.js ─────────────────────────────────────────────
const menuRouter = require('express').Router();
const auth = require('../middleware/auth');

menuRouter.get('/', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { canteen_id, date } = req.query;
  let where = [], params = [], idx = 1;
  if (canteen_id) { where.push(`canteen_id=$${idx++}`); params.push(canteen_id); }
  if (date)       { where.push(`service_date=$${idx++}`); params.push(date); }
  const w = where.length ? 'WHERE '+where.join(' AND ') : '';
  const { rows } = await db.query(`SELECT * FROM menus ${w} ORDER BY service_date,menu_type`, params);
  res.json(rows);
});

// GET /api/menus/today/:canteen_id
menuRouter.get('/today/:canteen_id', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { rows } = await db.query(
    `SELECT * FROM menus WHERE canteen_id=$1 AND service_date=CURRENT_DATE ORDER BY menu_type`,
    [req.params.canteen_id]
  );
  res.json(rows);
});

// GET /api/menus/week/:canteen_id
menuRouter.get('/week/:canteen_id', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { rows } = await db.query(
    `SELECT * FROM menus
     WHERE canteen_id=$1
       AND service_date >= DATE_TRUNC('week', CURRENT_DATE)
       AND service_date <  DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
     ORDER BY service_date, menu_type`,
    [req.params.canteen_id]
  );
  res.json(rows);
});

menuRouter.post('/', auth, auth.roles('admin','prestataire','rcantine'), async (req, res) => {
  const { canteen_id, service_date, name, description, menu_type, portions_planned } = req.body;
  const { rows } = await req.app.locals.db.query(
    `INSERT INTO menus (canteen_id,service_date,name,description,menu_type,portions_planned)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [canteen_id, service_date, name, description||null, menu_type||'standard', portions_planned||0]
  );
  res.status(201).json(rows[0]);
});

menuRouter.patch('/:id', auth, auth.roles('admin','prestataire'), async (req, res) => {
  const fields = ['name','description','menu_type','portions_planned','service_date'];
  const sets = [], params = [];
  fields.forEach(f => { if(req.body[f] !== undefined){ sets.push(`${f}=$${params.length+1}`); params.push(req.body[f]); }});
  if (!sets.length) return res.status(400).json({ error: 'Aucune donnée' });
  params.push(req.params.id);
  const { rows } = await req.app.locals.db.query(
    `UPDATE menus SET ${sets.join(',')} WHERE id=$${params.length} RETURNING *`, params
  );
  res.json(rows[0]);
});

menuRouter.delete('/:id', auth, auth.roles('admin','prestataire'), async (req, res) => {
  await req.app.locals.db.query('DELETE FROM menus WHERE id=$1', [req.params.id]);
  res.json({ message: 'Menu supprimé' });
});

module.exports = menuRouter;
