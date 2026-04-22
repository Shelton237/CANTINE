const router = require('express').Router();
const auth   = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// GET /api/employees — liste des employés (filtrée par company du user)
router.get('/', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { search, shift_id, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];
  let idx = 1;

  // DRH voit seulement ses employés
  if (req.user.role === 'drh') {
    where.push(`e.company_id = $${idx++}`);
    params.push(req.user.company_id);
  }
  if (search) {
    where.push(`(e.first_name ILIKE $${idx} OR e.last_name ILIKE $${idx} OR e.matricule ILIKE $${idx} OR e.email ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }
  if (shift_id) { where.push(`e.shift_id = $${idx++}`); params.push(shift_id); }
  if (status)   { where.push(`e.status = $${idx++}`);   params.push(status); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const countRes = await db.query(
      `SELECT COUNT(*) FROM employees e ${whereClause}`, params
    );
    const { rows } = await db.query(
      `SELECT e.*, s.name AS shift_name, s.start_time, s.end_time,
              c.name AS company_name,
              (SELECT MAX(checked_at) FROM checkins ci WHERE ci.employee_id = e.id) AS last_checkin
       FROM employees e
       LEFT JOIN shifts s ON s.id = e.shift_id
       LEFT JOIN companies c ON c.id = e.company_id
       ${whereClause}
       ORDER BY e.last_name, e.first_name
       LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, limit, offset]
    );
    res.json({ data: rows, total: parseInt(countRes.rows[0].count), page: +page, limit: +limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/employees/:id
router.get('/:id', auth, async (req, res) => {
  const db = req.app.locals.db;
  const { rows } = await db.query(
    `SELECT e.*, s.name AS shift_name, s.start_time, s.end_time
     FROM employees e
     LEFT JOIN shifts s ON s.id = e.shift_id
     WHERE e.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Employé introuvable' });
  const emp = { ...rows[0] };
  delete emp.pin_hash; // Ne jamais exposer le PIN
  res.json(emp);
});

// POST /api/employees — créer un employé
router.post('/', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  const { first_name, last_name, email, department, shift_id,
          access_method, pin, company_id } = req.body;

  if (!first_name || !last_name)
    return res.status(400).json({ error: 'Prénom et nom requis' });

  const cid = req.user.role === 'drh' ? req.user.company_id : company_id;
  if (!cid) return res.status(400).json({ error: 'company_id requis' });

  // Hash du PIN si fourni
  let pin_hash = null;
  if (access_method === 'pin' && pin) {
    if (pin.length !== 4 || isNaN(pin))
      return res.status(400).json({ error: 'PIN doit être 4 chiffres' });
    pin_hash = await bcrypt.hash(pin, 10);
  }

  let inserted = null;
  let attempts = 0;

  while (!inserted && attempts < 5) {
    attempts++;
    try {
      // Générer matricule auto global - Relecture sécurisée contre les doublons 23505
      const { rows: allEmps } = await db.query(
        `SELECT matricule FROM employees WHERE matricule LIKE 'EMP-%'`
      );
      let maxNum = 0;
      for (const row of allEmps) {
        const parsed = parseInt(row.matricule.replace('EMP-', ''), 10);
        if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      }
      const matricule = `EMP-${String(maxNum + 1).padStart(4, '0')}`;

      // QR code unique
      const qr_code = `QR-${uuidv4().substring(0,8).toUpperCase()}`;

      const { rows } = await db.query(
        `INSERT INTO employees (company_id, matricule, first_name, last_name, email,
                                department, shift_id, access_method, qr_code, pin_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, matricule, first_name, last_name, email, department, access_method, qr_code, status`,
        [cid, matricule, first_name, last_name, email||null, department||null,
         shift_id||null, access_method||'qr', qr_code, pin_hash]
      );
      inserted = rows[0];
    } catch (err) {
      if (err.code === '23505') {
        // En cas de conflit de données (doublon concurrent), on retente la boucle
        continue;
      }
      return res.status(500).json({ error: err.message });
    }
  }

  if (!inserted) {
    return res.status(409).json({ error: 'Collision persistante des données (409). Veuillez réessayer.' });
  }

  res.status(201).json(inserted);
});

// PATCH /api/employees/:id
router.patch('/:id', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  const { first_name, last_name, email, department, shift_id, access_method, status, pin } = req.body;

  let sets = [], params = [], idx = 1;
  if (first_name)     { sets.push(`first_name=$${idx++}`);     params.push(first_name); }
  if (last_name)      { sets.push(`last_name=$${idx++}`);      params.push(last_name); }
  if (email !== undefined) { sets.push(`email=$${idx++}`);     params.push(email); }
  if (department)     { sets.push(`department=$${idx++}`);     params.push(department); }
  if (shift_id)       { sets.push(`shift_id=$${idx++}`);       params.push(shift_id); }
  if (access_method)  { sets.push(`access_method=$${idx++}`);  params.push(access_method); }
  if (status)         { sets.push(`status=$${idx++}`);         params.push(status); }
  if (pin && access_method === 'pin') {
    const hash = await bcrypt.hash(pin, 10);
    sets.push(`pin_hash=$${idx++}`); params.push(hash);
  }
  if (!sets.length) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

  sets.push(`updated_at=NOW()`);
  params.push(req.params.id);

  const { rows } = await db.query(
    `UPDATE employees SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'Employé introuvable' });
  delete rows[0].pin_hash;
  res.json(rows[0]);
});

// DELETE /api/employees/:id
router.delete('/:id', auth, auth.roles('admin','drh'), async (req, res) => {
  const db = req.app.locals.db;
  await db.query(`UPDATE employees SET status='inactive' WHERE id=$1`, [req.params.id]);
  res.json({ message: 'Employé désactivé' });
});

// POST /api/employees/import — import CSV
router.post('/import', auth, auth.roles('admin','drh'), async (req, res) => {
  // Les développeurs peuvent connecter multer + csv-parse ici
  res.status(501).json({ message: 'Import CSV — à implémenter avec multer + csv-parse' });
});

module.exports = router;
