const router = require('express').Router();
const auth   = require('../middleware/auth');

router.get('/', auth, auth.roles('admin'), async (req, res) => {
  const { rows } = await req.app.locals.db.query(
    `SELECT p.*, COUNT(DISTINCT cp.canteen_id) AS canteen_count
     FROM providers p
     LEFT JOIN canteen_providers cp ON cp.provider_id=p.id
     GROUP BY p.id ORDER BY p.name`
  );
  res.json(rows);
});

router.get('/my', auth, auth.roles('prestataire'), async (req, res) => {
  const db = req.app.locals.db;
  const { rows } = await db.query(
    `SELECT p.*, COUNT(DISTINCT cp.canteen_id) AS canteen_count
     FROM providers p
     LEFT JOIN canteen_providers cp ON cp.provider_id=p.id
     JOIN users u ON u.provider_id=p.id
     WHERE u.id=$1 GROUP BY p.id`,
    [req.user.id]
  );
  res.json(rows[0] || null);
});

router.get('/my/canteens', auth, auth.roles('prestataire','admin'), async (req, res) => {
  const db = req.app.locals.db;
  const provId = req.user.provider_id;
  const { rows } = await db.query(
    `SELECT ca.*, co.name AS company_name,
            (SELECT COUNT(*) FROM checkins ci WHERE ci.canteen_id=ca.id AND DATE(ci.checked_at)=CURRENT_DATE AND ci.status='approved') AS today_count
     FROM canteens ca
     JOIN canteen_providers cp ON cp.canteen_id=ca.id
     JOIN companies co ON co.id=ca.company_id
     WHERE cp.provider_id=$1`,
    [provId]
  );
  res.json(rows);
});

router.get('/my/staff', auth, auth.roles('prestataire'), async (req, res) => {
  const { rows } = await req.app.locals.db.query(
    'SELECT * FROM provider_staff WHERE provider_id=$1 ORDER BY last_name',
    [req.user.provider_id]
  );
  res.json(rows);
});

router.post('/my/staff', auth, auth.roles('prestataire'), async (req, res) => {
  const { first_name, last_name, role, canteen_id, shift_name } = req.body;
  const { rows } = await req.app.locals.db.query(
    `INSERT INTO provider_staff (provider_id,first_name,last_name,role,canteen_id,shift_name)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.provider_id, first_name, last_name, role||null, canteen_id||null, shift_name||null]
  );
  res.status(201).json(rows[0]);
});

router.get('/my/orders', auth, auth.roles('prestataire'), async (req, res) => {
  const { rows } = await req.app.locals.db.query(
    'SELECT * FROM supplier_orders WHERE provider_id=$1 ORDER BY delivery_date DESC',
    [req.user.provider_id]
  );
  res.json(rows);
});

router.post('/my/orders', auth, auth.roles('prestataire'), async (req, res) => {
  const { supplier_name, products, quantity_kg, delivery_date, amount_mga } = req.body;
  const { rows } = await req.app.locals.db.query(
    `INSERT INTO supplier_orders (provider_id,supplier_name,products,quantity_kg,delivery_date,amount_mga)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.provider_id, supplier_name, products||null, quantity_kg||null, delivery_date||null, amount_mga||null]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
