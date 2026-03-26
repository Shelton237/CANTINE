// ============================================================
// dashboard.js
// ============================================================
const dashRouter = require('express').Router();
const auth = require('../middleware/auth');

dashRouter.get('/', auth, async (req, res) => {
  const db = req.app.locals.db;
  const today = new Date().toISOString().split('T')[0];

  try {
    if (req.user.role === 'drh' || req.user.role === 'tablette') {
      const cid = req.user.company_id;

      const [todayRes, monthRes, quotaRes, alertRes] = await Promise.all([
        db.query(
          `SELECT COUNT(*) AS count FROM checkins ci
           JOIN canteens can ON can.id=ci.canteen_id
           WHERE can.company_id=$1 AND DATE(ci.checked_at)=$2 AND ci.status='approved'`,
          [cid, today]
        ),
        db.query(
          `SELECT COUNT(*) AS count FROM checkins ci
           JOIN canteens can ON can.id=ci.canteen_id
           WHERE can.company_id=$1
             AND EXTRACT(MONTH FROM ci.checked_at)=EXTRACT(MONTH FROM NOW())
             AND EXTRACT(YEAR FROM ci.checked_at)=EXTRACT(YEAR FROM NOW())
             AND ci.status='approved'`, [cid]
        ),
        db.query('SELECT monthly_quota, meal_price, commission_rate FROM companies WHERE id=$1', [cid]),
        db.query(
          `SELECT COUNT(*) AS count FROM checkins ci
           JOIN canteens can ON can.id=ci.canteen_id
           WHERE can.company_id=$1 AND DATE(ci.checked_at)=$2 AND ci.status!='approved'`,
          [cid, today]
        )
      ]);

      const comp = quotaRes.rows[0] || {};
      const monthlyReal = parseInt(monthRes.rows[0].count);
      const quota = comp.monthly_quota || 0;
      const savings = Math.max(0, quota - monthlyReal) * (comp.meal_price || 0);

      return res.json({
        today_checkins:  parseInt(todayRes.rows[0].count),
        month_checkins:  monthlyReal,
        monthly_quota:   quota,
        savings_mga:     savings,
        refused_today:   parseInt(alertRes.rows[0].count)
      });
    }

    if (req.user.role === 'admin') {
      const [companiesRes, checkinsRes, savingsRes] = await Promise.all([
        db.query(`SELECT COUNT(*) AS count FROM companies WHERE status='active'`),
        db.query(
          `SELECT COUNT(*) AS count FROM checkins
           WHERE DATE(checked_at)=$1 AND status='approved'`, [today]
        ),
        db.query(
          `SELECT COALESCE(SUM(
             GREATEST(0, (co.monthly_quota - sub.real_count)) * co.meal_price
           ), 0) AS total_savings
           FROM companies co
           LEFT JOIN (
             SELECT can.company_id, COUNT(ci.id) AS real_count
             FROM checkins ci JOIN canteens can ON can.id=ci.canteen_id
             WHERE EXTRACT(MONTH FROM ci.checked_at)=EXTRACT(MONTH FROM NOW())
               AND ci.status='approved'
             GROUP BY can.company_id
           ) sub ON sub.company_id=co.id`
        )
      ]);

      return res.json({
        active_companies: parseInt(companiesRes.rows[0].count),
        today_checkins:   parseInt(checkinsRes.rows[0].count),
        monthly_savings:  parseInt(savingsRes.rows[0].total_savings)
      });
    }

    res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = dashRouter;
