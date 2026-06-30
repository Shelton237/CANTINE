require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { Pool }   = require('pg');

const app = express();

// ─── Middlewares ───────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://app.cantine.usra-care.com',
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, mobile, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origine non autorisée — ${origin}`));
  },
  credentials: true
}));
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
