const router = require('express').Router();
const auth   = require('../middleware/auth');

// GET /api/reports/monthly — rapport mensuel avec calcul d'économies
router.get('/monthly', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { year, month, company_id, canteen_id } = req.query;

  const y = parseInt(year)  || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const cid = req.user.role === 'drh' ? req.user.company_id : company_id;

  if (!cid) return res.status(400).json({ error: 'company_id requis' });

  try {
    // Infos de l'entreprise
    const { rows: companies } = await db.query(
      'SELECT * FROM companies WHERE id=$1', [cid]
    );
    const company = companies[0];
    if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });

    // Nombre total de jours ouvrés dans le mois (approx)
    const workdays = getWorkdays(y, m);

    // Repas réels consommés ce mois
    let checkinQuery = `
      SELECT COUNT(*) AS total_checkins,
             DATE_TRUNC('week', ci.checked_at) AS week_start
      FROM checkins ci
      JOIN canteens can ON can.id = ci.canteen_id
      WHERE can.company_id=$1
        AND status='approved'
        AND EXTRACT(YEAR FROM ci.checked_at)=$2
        AND EXTRACT(MONTH FROM ci.checked_at)=$3
    `;
    const params = [cid, y, m];
    if (canteen_id) { checkinQuery += ' AND ci.canteen_id=$4'; params.push(canteen_id); }
    checkinQuery += ' GROUP BY week_start ORDER BY week_start';

    const { rows: weeklyData } = await db.query(checkinQuery, params);

    // Total repas réels
    const totalReal = weeklyData.reduce((s, r) => s + parseInt(r.total_checkins), 0);

    // Quota mensuel
    const quota = company.monthly_quota;

    // Calculs économies
    const savings    = Math.max(0, quota - totalReal) * company.meal_price;
    const commission = Math.round(savings * (company.commission_rate / 100));
    const savingsRate = quota > 0 ? ((quota - totalReal) / quota * 100).toFixed(1) : 0;

    // Par shift
    const { rows: shiftData } = await db.query(
      `SELECT s.name AS shift_name, COUNT(ci.id) AS count
       FROM checkins ci
       JOIN canteens can ON can.id = ci.canteen_id
       LEFT JOIN shifts s ON s.id = ci.shift_id
       WHERE can.company_id=$1 AND ci.status='approved'
         AND EXTRACT(YEAR FROM ci.checked_at)=$2
         AND EXTRACT(MONTH FROM ci.checked_at)=$3
       GROUP BY s.name ORDER BY count DESC`,
      [cid, y, m]
    );

    // Par jour (pour le graphique)
    const { rows: dailyData } = await db.query(
      `SELECT DATE(ci.checked_at) AS day, COUNT(*) AS count
       FROM checkins ci
       JOIN canteens can ON can.id = ci.canteen_id
       WHERE can.company_id=$1 AND ci.status='approved'
         AND EXTRACT(YEAR FROM ci.checked_at)=$2
         AND EXTRACT(MONTH FROM ci.checked_at)=$3
       GROUP BY day ORDER BY day`,
      [cid, y, m]
    );

    res.json({
      company: { id: company.id, name: company.name },
      period: { year: y, month: m, workdays },
      quota: { monthly: quota, daily: Math.round(quota / workdays), meal_price: company.meal_price },
      actual: { total: totalReal, daily_avg: workdays > 0 ? Math.round(totalReal / workdays) : 0 },
      savings: { mga: savings, rate: parseFloat(savingsRate) },
      commission: { rate: parseFloat(company.commission_rate), mga: commission },
      by_shift: shiftData,
      by_week:  weeklyData.map((w, i) => ({
        label: `S${i+1}`,
        actual: parseInt(w.total_checkins),
        quota: Math.round(quota / 4),
        savings: Math.max(0, Math.round(quota/4) - parseInt(w.total_checkins)) * company.meal_price
      })),
      daily_chart: dailyData.map(d => ({
        day: d.day, count: parseInt(d.count), quota: Math.round(quota / workdays)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/platform — rapport global admin
router.get('/platform', auth, auth.roles('admin'), async (req, res) => {
  const db = req.app.locals.db;
  const { year, month } = req.query;
  const y = parseInt(year)  || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;

  const { rows } = await db.query(
    `SELECT co.id, co.name, co.monthly_quota, co.meal_price, co.commission_rate,
            COUNT(DISTINCT e.id) AS employee_count,
            COALESCE(SUM(CASE WHEN ci.status='approved'
              AND EXTRACT(YEAR FROM ci.checked_at)=$1
              AND EXTRACT(MONTH FROM ci.checked_at)=$2 THEN 1 END), 0) AS checkins_month
     FROM companies co
     LEFT JOIN employees e   ON e.company_id  = co.id AND e.status='active'
     LEFT JOIN canteens  can ON can.company_id = co.id
     LEFT JOIN checkins  ci  ON ci.canteen_id  = can.id
     WHERE co.status != 'inactive'
     GROUP BY co.id ORDER BY co.name`,
    [y, m]
  );

  const data = rows.map(r => {
    const real     = parseInt(r.checkins_month);
    const savings  = Math.max(0, r.monthly_quota - real) * r.meal_price;
    const comm     = Math.round(savings * r.commission_rate / 100);
    return { ...r, savings_mga: savings, commission_mga: comm };
  });

  res.json({
    period: { year: y, month: m },
    companies: data,
    totals: {
      savings_mga:     data.reduce((s,r) => s + r.savings_mga, 0),
      commission_mga:  data.reduce((s,r) => s + r.commission_mga, 0),
      total_employees: data.reduce((s,r) => s + parseInt(r.employee_count), 0),
      total_checkins:  data.reduce((s,r) => s + parseInt(r.checkins_month), 0)
    }
  });
});

function getWorkdays(year, month) {
  let count = 0;
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

module.exports = router;
