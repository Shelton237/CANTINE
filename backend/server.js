require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { Pool }   = require('pg');

const app = express();

// ─── Middlewares ───────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ─── Base de données ───────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (err) => console.error('DB pool error:', err));
app.locals.db = pool;

// ─── Routes ────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/companies',  require('./routes/companies'));
app.use('/api/canteens',   require('./routes/canteens'));
app.use('/api/shifts',     require('./routes/shifts'));
app.use('/api/schedules',  require('./routes/schedules'));
app.use('/api/employees',  require('./routes/employees'));
app.use('/api/checkins',   require('./routes/checkins'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/menus',      require('./routes/menus'));
app.use('/api/providers',  require('./routes/providers'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/alerts',     require('./routes/alerts'));
app.use('/api/invoices',   require('./routes/invoices'));
app.use('/api/holidays',   require('./routes/holidays'));

// ─── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`CantineTrack API → http://localhost:${PORT}`));
