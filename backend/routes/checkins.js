const router = require('express').Router();
const auth   = require('../middleware/auth');
const bcrypt = require('bcrypt');

// POST /api/checkins — enregistrer un repas (depuis tablette)
router.post('/', auth, auth.roles('tablette','admin'), async (req, res) => {
  const db = req.app.locals.db;
  const { qr_code, pin, nfc_uid, canteen_id, access_method, device_id } = req.body;

  if (!canteen_id) return res.status(400).json({ error: 'canteen_id requis' });
  if (!access_method) return res.status(400).json({ error: 'access_method requis (qr|pin|nfc)' });

  try {
    // 1. Trouver l'employé
    let employee = null;
    if (access_method === 'qr' && qr_code) {
      const { rows } = await db.query(
        `SELECT e.*, s.name AS shift_name, s.start_time, s.end_time
         FROM employees e LEFT JOIN shifts s ON s.id = e.shift_id
         WHERE e.qr_code = $1`, [qr_code]
      );
      employee = rows[0];
    } else if (access_method === 'nfc' && nfc_uid) {
      const { rows } = await db.query(
        `SELECT e.*, s.name AS shift_name, s.start_time, s.end_time
         FROM employees e LEFT JOIN shifts s ON s.id = e.shift_id
         WHERE e.nfc_uid = $1`, [nfc_uid]
      );
      employee = rows[0];
    } else if (access_method === 'pin' && pin) {
      // On ne peut pas chercher par PIN haché directement — on cherche par company
      const canteenRes = await db.query(
        'SELECT company_id FROM canteens WHERE id=$1', [canteen_id]
      );
      if (!canteenRes.rows[0]) return res.status(404).json({ error: 'Cantine introuvable' });

      const { rows: emps } = await db.query(
        `SELECT e.*, s.name AS shift_name, s.start_time, s.end_time
         FROM employees e LEFT JOIN shifts s ON s.id = e.shift_id
         WHERE e.company_id=$1 AND e.access_method='pin' AND e.status='active'`,
        [canteenRes.rows[0].company_id]
      );
      // Comparer les hashes
      for (const emp of emps) {
        if (emp.pin_hash && await bcrypt.compare(pin, emp.pin_hash)) {
          employee = emp; break;
        }
      }
    }

    // 2. Badge inconnu
    if (!employee) {
      return res.json({
        status: 'refused_unknown',
        message: 'Badge non reconnu — aucun employé associé',
        employee: null
      });
    }

    // 3. Employé suspendu
    if (employee.status !== 'active') {
      await db.query(
        `INSERT INTO checkins (employee_id, canteen_id, access_method, status, device_id)
         VALUES ($1,$2,$3,'refused_suspended',$4)`,
        [employee.id, canteen_id, access_method, device_id||null]
      );
      return res.json({
        status: 'refused_suspended',
        message: 'Accès refusé — compte suspendu',
        employee: { first_name: employee.first_name, last_name: employee.last_name }
      });
    }

    // 4. Vérifier le créneau horaire
    if (employee.start_time && employee.end_time) {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      // Gestion shift nuit (end < start)
      const isNightShift = employee.end_time < employee.start_time;
      let inShift;
      if (isNightShift) {
        inShift = hhmm >= employee.start_time || hhmm <= employee.end_time;
      } else {
        inShift = hhmm >= employee.start_time && hhmm <= employee.end_time;
      }

      if (!inShift) {
        await db.query(
          `INSERT INTO checkins (employee_id, canteen_id, shift_id, access_method, status, device_id)
           VALUES ($1,$2,$3,'refused_wrong_shift',$4)`,  // manque access_method placeholder
          [employee.id, canteen_id, employee.shift_id, access_method, device_id||null]
        );
        return res.json({
          status: 'refused_wrong_shift',
          message: `Hors créneau — shift ${employee.shift_name} : ${employee.start_time}–${employee.end_time}`,
          employee: { first_name: employee.first_name, last_name: employee.last_name, shift_name: employee.shift_name }
        });
      }
    }

    // 5. Vérifier doublon (déjà mangé aujourd'hui)
    const today = new Date().toISOString().split('T')[0];
    const { rows: todayCheckins } = await db.query(
      `SELECT id FROM checkins
       WHERE employee_id=$1 AND canteen_id=$2
         AND DATE(checked_at) = $3 AND status='approved'`,
      [employee.id, canteen_id, today]
    );

    if (todayCheckins.length > 0) {
      await db.query(
        `INSERT INTO checkins (employee_id, canteen_id, shift_id, access_method, status, device_id)
         VALUES ($1,$2,$3,$4,'refused_already_eaten',$5)`,
        [employee.id, canteen_id, employee.shift_id, access_method, device_id||null]
      );
      return res.json({
        status: 'refused_already_eaten',
        message: 'Accès refusé — repas déjà enregistré aujourd\'hui',
        employee: { first_name: employee.first_name, last_name: employee.last_name }
      });
    }

    // 6. ACCÈS APPROUVÉ
    const { rows: checkin } = await db.query(
      `INSERT INTO checkins (employee_id, canteen_id, shift_id, access_method, status, device_id)
       VALUES ($1,$2,$3,$4,'approved',$5)
       RETURNING id, checked_at`,
      [employee.id, canteen_id, employee.shift_id, access_method, device_id||null]
    );

    res.json({
      status: 'approved',
      message: 'Accès autorisé — bon appétit !',
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        department: employee.department,
        shift_name: employee.shift_name,
        access_method
      },
      checkin: checkin[0]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/checkins — historique (DRH ou admin)
router.get('/', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { canteen_id, date, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let where = [], params = [], idx = 1;

  if (req.user.role === 'drh') {
    where.push(`c.company_id = $${idx++}`);
    params.push(req.user.company_id);
  }
  if (canteen_id) { where.push(`ci.canteen_id = $${idx++}`); params.push(canteen_id); }
  if (date)       { where.push(`DATE(ci.checked_at) = $${idx++}`); params.push(date); }
  if (status)     { where.push(`ci.status = $${idx++}`); params.push(status); }

  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const { rows } = await db.query(
    `SELECT ci.id, ci.checked_at, ci.status, ci.access_method,
            e.first_name, e.last_name, e.matricule, e.department,
            s.name AS shift_name, can.name AS canteen_name
     FROM checkins ci
     JOIN employees e   ON e.id  = ci.employee_id
     JOIN canteens  can ON can.id = ci.canteen_id
     LEFT JOIN shifts s ON s.id  = ci.shift_id
     ${w}
     ORDER BY ci.checked_at DESC
     LIMIT $${idx} OFFSET $${idx+1}`,
    [...params, limit, offset]
  );
  res.json({ data: rows, page: +page, limit: +limit });
});

// GET /api/checkins/today-count/:canteen_id
router.get('/today-count/:canteen_id', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { rows } = await db.query(
    `SELECT COUNT(*) AS count
     FROM checkins
     WHERE canteen_id=$1 AND DATE(checked_at)=CURRENT_DATE AND status='approved'`,
    [req.params.canteen_id]
  );
  res.json({ count: parseInt(rows[0].count) });
});

module.exports = router;
