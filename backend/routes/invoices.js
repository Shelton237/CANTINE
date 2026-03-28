// Workflow facturation DAF
// GET  /api/invoices                   — liste factures
// GET  /api/invoices/:id               — détail facture
// POST /api/invoices/generate          — générer factures du mois
// PATCH /api/invoices/:id/validate     — valider et payer
// PATCH /api/invoices/:id/contest      — contester

const router = require('express').Router();
const auth   = require('../middleware/auth');

// GET /api/invoices
router.get('/', auth, auth.roles('admin','daf','drh'), async (req, res) => {
  const db = req.app.locals.db;
  const { year, month, status } = req.query;

  let where = [], params = [], idx = 1;

  if (req.user.role === 'daf' || req.user.role === 'drh') {
    where.push(`i.company_id = $${idx++}`);
    params.push(req.user.company_id);
  }
  if (year)   { where.push(`i.year  = $${idx++}`); params.push(year); }
  if (month)  { where.push(`i.month = $${idx++}`); params.push(month); }
  if (status) { where.push(`i.status = $${idx++}`); params.push(status); }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const { rows } = await db.query(
    `SELECT i.*,
            co.name  AS company_name,
            ca.name  AS canteen_name,
            pr.name  AS provider_name
     FROM invoices i
     JOIN companies co ON co.id = i.company_id
     LEFT JOIN canteens  ca ON ca.id = i.canteen_id
     LEFT JOIN providers pr ON pr.id = i.provider_id
     ${w}
     ORDER BY i.year DESC, i.month DESC`,
    params
  );
  res.json(rows);
});

// GET /api/invoices/:id
router.get('/:id', auth, auth.roles('admin','daf','drh'), async (req, res) => {
  const db = req.app.locals.db;
  const { rows } = await db.query(
    `SELECT i.*,
            co.name AS company_name, co.monthly_quota, co.meal_price, co.commission_rate,
            ca.name AS canteen_name,
            pr.name AS provider_name
     FROM invoices i
     JOIN companies co ON co.id = i.company_id
     LEFT JOIN canteens  ca ON ca.id = i.canteen_id
     LEFT JOIN providers pr ON pr.id = i.provider_id
     WHERE i.id=$1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Facture introuvable' });
  res.json(rows[0]);
});

// POST /api/invoices/generate — calcul automatique depuis les scans
router.post('/generate', auth, auth.roles('admin','daf'), async (req, res) => {
  const db = req.app.locals.db;
  const { year, month, company_id } = req.body;
  const y = year  || new Date().getFullYear();
  const m = month || new Date().getMonth() + 1;

  // Récupérer toutes les entreprises concernées
  let cids;
  if (company_id) {
    cids = [company_id];
  } else {
    const { rows } = await db.query("SELECT id FROM companies WHERE status != 'inactive'");
    cids = rows.map(r => r.id);
  }

  const results = [];

  for (const cid of cids) {
    const { rows: [co] } = await db.query('SELECT * FROM companies WHERE id=$1', [cid]);
    if (!co) continue;

    // Cantines de cette entreprise
    const { rows: canteens } = await db.query(
      'SELECT ca.*, cp.provider_id FROM canteens ca LEFT JOIN canteen_providers cp ON cp.canteen_id=ca.id WHERE ca.company_id=$1',
      [cid]
    );

    for (const ca of canteens) {
      // Compter les repas réels sur le mois
      const { rows: [cnt] } = await db.query(
        `SELECT COUNT(*) AS count
         FROM checkins
         WHERE canteen_id=$1
           AND EXTRACT(YEAR  FROM checked_at) = $2
           AND EXTRACT(MONTH FROM checked_at) = $3
           AND status='approved'`,
        [ca.id, y, m]
      );

      const actualCheckins = parseInt(cnt.count);
      const mealPrice      = co.meal_price;
      const quota          = co.monthly_quota;
      const commRate       = parseFloat(co.commission_rate) / 100;

      const forfaitMga   = quota        * mealPrice;
      const actualMga    = actualCheckins * mealPrice;
      const savingsMga   = Math.max(0, forfaitMga - actualMga);
      const commissionMga= Math.round(savingsMga * commRate);
      const netSavingsMga= savingsMga - commissionMga;

      const { rows: [inv] } = await db.query(
        `INSERT INTO invoices
           (company_id, canteen_id, provider_id, year, month,
            monthly_quota, actual_checkins, meal_price,
            forfait_mga, actual_mga, savings_mga, commission_mga, net_savings_mga, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')
         ON CONFLICT (company_id, canteen_id, year, month)
         DO UPDATE SET
           actual_checkins=$7, actual_mga=$10,
           savings_mga=$11, commission_mga=$12, net_savings_mga=$13
         RETURNING *`,
        [cid, ca.id, ca.provider_id||null, y, m,
         quota, actualCheckins, mealPrice,
         forfaitMga, actualMga, savingsMga, commissionMga, netSavingsMga]
      );
      results.push(inv);
    }
  }

  res.status(201).json({ generated: results.length, invoices: results });
});

// PATCH /api/invoices/:id/validate
router.patch('/:id/validate', auth, auth.roles('admin','daf'), async (req, res) => {
  const db  = req.app.locals.db;
  const { notes } = req.body;
  const { rows } = await db.query(
    `UPDATE invoices
     SET status='validated', validated_by=$1, validated_at=NOW(), notes=$2
     WHERE id=$3
     RETURNING *`,
    [req.user.id, notes||null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Facture introuvable' });
  res.json(rows[0]);
});

// PATCH /api/invoices/:id/contest
router.patch('/:id/contest', auth, auth.roles('admin','daf'), async (req, res) => {
  const db = req.app.locals.db;
  const { notes } = req.body;
  const { rows } = await db.query(
    `UPDATE invoices SET status='contested', notes=$1 WHERE id=$2 RETURNING *`,
    [notes||null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Facture introuvable' });
  res.json(rows[0]);
});

module.exports = router;
