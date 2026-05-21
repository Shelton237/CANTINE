-- CantineTrack — Migration v2
-- Phase 0 : ajout des 4 nouveaux rôles + tables manquantes
-- À exécuter : psql $DATABASE_URL -f db/migration_v2.sql

-- ============================================================
-- 1. EXTENSION DU RÔLE UTILISATEUR
-- ============================================================

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Ajouter la nouvelle contrainte avec les 8 rôles
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','drh','daf','dg','prestataire','tablette','rcantine','employe'));

-- ============================================================
-- 2. ENRICHISSEMENT DE LA TABLE SHIFTS
-- ============================================================

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS tolerance_min  INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS days_of_week   INTEGER[] DEFAULT '{1,2,3,4,5}'; -- 1=Lun ... 7=Dim

-- Mettre à jour les shifts de démo avec les bonnes tolérances
UPDATE shifts SET tolerance_min = 15 WHERE name = 'Matin';
UPDATE shifts SET tolerance_min = 10 WHERE name = 'Midi';
UPDATE shifts SET tolerance_min = 20 WHERE name = 'Soir';
UPDATE shifts SET tolerance_min = 30 WHERE name = 'Nuit';

UPDATE shifts SET days_of_week = '{1,2,3,4,5,6}' WHERE name IN ('Matin', 'Soir');
UPDATE shifts SET days_of_week = '{1,2,3,4,5}'   WHERE name = 'Midi';
UPDATE shifts SET days_of_week = '{1,2,3,4,5,6,7}' WHERE name = 'Nuit';

-- ============================================================
-- 3. PLANNING ROTATIF (employee_schedules)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_schedules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  canteen_id   UUID NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,          -- lundi de la semaine (ex: 2026-03-24)
  day_of_week  INTEGER NOT NULL        -- 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam, 7=Dim
                 CHECK (day_of_week BETWEEN 1 AND 7),
  is_free      BOOLEAN DEFAULT false,  -- "Choix libre" ce jour-là
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, week_start, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_schedules_emp_week
  ON employee_schedules(employee_id, week_start);
CREATE INDEX IF NOT EXISTS idx_schedules_canteen_week
  ON employee_schedules(canteen_id, week_start);

-- ============================================================
-- 4. ALERTES INTELLIGENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  canteen_id   UUID REFERENCES canteens(id) ON DELETE SET NULL,
  employee_id  UUID REFERENCES employees(id) ON DELETE SET NULL,
  type         VARCHAR(50) NOT NULL
                 CHECK (type IN ('doublon','quota_warning','quota_urgent','hors_horaire','badge_inconnu','autre')),
  severity     VARCHAR(20) NOT NULL DEFAULT 'info'
                 CHECK (severity IN ('info','warning','critical')),
  title        VARCHAR(255) NOT NULL,
  message      TEXT,
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_company   ON alerts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread    ON alerts(company_id, is_read) WHERE is_read = false;

-- ============================================================
-- 5. FACTURES / INVOICES (workflow DAF)
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  canteen_id        UUID REFERENCES canteens(id),
  provider_id       UUID REFERENCES providers(id),
  year              INTEGER NOT NULL,
  month             INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  monthly_quota     INTEGER NOT NULL DEFAULT 0,   -- repas forfait
  actual_checkins   INTEGER NOT NULL DEFAULT 0,   -- repas réels scannés
  meal_price        INTEGER NOT NULL DEFAULT 0,   -- MGA/repas
  forfait_mga       BIGINT NOT NULL DEFAULT 0,    -- quota × prix
  actual_mga        BIGINT NOT NULL DEFAULT 0,    -- réel × prix
  savings_mga       BIGINT NOT NULL DEFAULT 0,    -- forfait - réel
  commission_mga    BIGINT NOT NULL DEFAULT 0,    -- savings × taux
  net_savings_mga   BIGINT NOT NULL DEFAULT 0,    -- savings - commission
  status            VARCHAR(20) DEFAULT 'pending'
                      CHECK (status IN ('pending','validated','contested','paid')),
  validated_by      UUID REFERENCES users(id),
  validated_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, canteen_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status);

-- ============================================================
-- 6. JOURS FÉRIÉS (holidays)
-- ============================================================

CREATE TABLE IF NOT EXISTS holidays (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country     VARCHAR(10) DEFAULT 'MG',
  name        VARCHAR(255) NOT NULL,
  date        DATE NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Jours fériés malgaches 2026
INSERT INTO holidays (name, date) VALUES
  ('Jour de l''an',                '2026-01-01'),
  ('Journée de la femme',          '2026-03-08'),
  ('Anniversaire 1947',            '2026-03-29'),
  ('Fête du travail',              '2026-05-01'),
  ('Journée de l''Afrique',        '2026-05-25'),
  ('Fête nationale',               '2026-06-26'),
  ('Assomption',                   '2026-08-15'),
  ('Toussaint',                    '2026-11-01'),
  ('Noël',                         '2026-12-25')
ON CONFLICT (date) DO NOTHING;

-- ============================================================
-- 7. NOUVEAUX UTILISATEURS DE DÉMO
-- ============================================================

-- Mot de passe = "password123" (même hash bcrypt que les autres)
-- IMPORTANT : remplacer le hash par le vrai hash bcrypt avant usage prod
-- En dev, exécuter : node -e "const b=require('bcrypt'); b.hash('password123',10).then(console.log)"

INSERT INTO users (email, password_hash, first_name, last_name, role, company_id)
VALUES
  ('daf@telma.mg',
   '$2b$10$Ws2GK8JdgudVAuyeVvRWZe2fczHsNkUokKsUO6NDbEAdYgKoBJE.i',
   'Fara', 'Andriamaro', 'daf',
   '11111111-0000-0000-0000-000000000001'),

  ('dg@telma.mg',
   '$2b$10$Ws2GK8JdgudVAuyeVvRWZe2fczHsNkUokKsUO6NDbEAdYgKoBJE.i',
   'Patrick', 'Rasolofo', 'dg',
   '11111111-0000-0000-0000-000000000001'),

  ('rcantine@telma.mg',
   '$2b$10$Ws2GK8JdgudVAuyeVvRWZe2fczHsNkUokKsUO6NDbEAdYgKoBJE.i',
   'Nivo', 'Rakoto', 'rcantine',
   '11111111-0000-0000-0000-000000000001'),

  ('employe@telma.mg',
   '$2b$10$Ws2GK8JdgudVAuyeVvRWZe2fczHsNkUokKsUO6NDbEAdYgKoBJE.i',
   'Andry', 'Rakoto', 'employe',
   '11111111-0000-0000-0000-000000000001')

ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 8. AJOUT DU STATUT 'refused_wrong_canteen' DANS LES CHECKINS
-- ============================================================
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_status_check;
ALTER TABLE checkins ADD CONSTRAINT checkins_status_check
  CHECK (status IN ('approved', 'refused_already_eaten', 'refused_wrong_shift', 'refused_suspended', 'refused_unknown', 'refused_wrong_canteen'));

