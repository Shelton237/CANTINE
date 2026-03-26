-- CantineTrack — Schéma PostgreSQL complet
-- Version 1.0 — Mars 2026

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENTREPRISES
-- ============================================================
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  logo_initials VARCHAR(4),
  address       TEXT,
  city          VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  monthly_quota INTEGER NOT NULL DEFAULT 0,  -- repas forfait/mois
  meal_price    INTEGER NOT NULL DEFAULT 5000, -- MGA par repas (prix unitaire forfait)
  commission_rate DECIMAL(5,2) DEFAULT 18.00, -- % des économies
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','pilot','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CANTINES
-- ============================================================
CREATE TABLE canteens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  location      VARCHAR(255),
  is_open       BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SHIFTS (créneaux horaires autorisés)
-- ============================================================
CREATE TABLE shifts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canteen_id    UUID NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,  -- ex: "Midi"
  start_time    TIME NOT NULL,          -- ex: 11:30
  end_time      TIME NOT NULL,          -- ex: 13:30
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRESTATAIRES
-- ============================================================
CREATE TABLE providers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Liaison cantine <-> prestataire
CREATE TABLE canteen_providers (
  canteen_id    UUID REFERENCES canteens(id) ON DELETE CASCADE,
  provider_id   UUID REFERENCES providers(id) ON DELETE CASCADE,
  contract_start DATE,
  PRIMARY KEY (canteen_id, provider_id)
);

-- ============================================================
-- UTILISATEURS (toutes les rôles)
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','drh','prestataire','tablette')),
  company_id    UUID REFERENCES companies(id),
  provider_id   UUID REFERENCES providers(id),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

-- ============================================================
-- EMPLOYÉS
-- ============================================================
CREATE TABLE employees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  matricule     VARCHAR(50) UNIQUE NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255),
  department    VARCHAR(100),
  shift_id      UUID REFERENCES shifts(id),
  access_method VARCHAR(20) DEFAULT 'qr' CHECK (access_method IN ('qr','pin','nfc')),
  qr_code       VARCHAR(255) UNIQUE,  -- token unique pour QR
  pin_hash      VARCHAR(255),         -- hash du code PIN
  nfc_uid       VARCHAR(100) UNIQUE,  -- UID du badge NFC
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHECK-INS (chaque repas pris)
-- ============================================================
CREATE TABLE checkins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID NOT NULL REFERENCES employees(id),
  canteen_id    UUID NOT NULL REFERENCES canteens(id),
  shift_id      UUID REFERENCES shifts(id),
  checked_at    TIMESTAMPTZ DEFAULT NOW(),
  access_method VARCHAR(20),   -- qr / pin / nfc
  status        VARCHAR(20) NOT NULL CHECK (status IN ('approved','refused_already_eaten','refused_wrong_shift','refused_suspended','refused_unknown')),
  device_id     VARCHAR(100),  -- ID de la tablette
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_checkins_employee_date ON checkins(employee_id, checked_at);
CREATE INDEX idx_checkins_canteen_date  ON checkins(canteen_id, checked_at);
CREATE INDEX idx_checkins_date          ON checkins(checked_at);

-- ============================================================
-- MENUS (prestataire)
-- ============================================================
CREATE TABLE menus (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canteen_id    UUID NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  service_date  DATE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  menu_type     VARCHAR(30) DEFAULT 'standard' CHECK (menu_type IN ('standard','vegetarian','premium')),
  portions_planned INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERSONNEL PRESTATAIRE
-- ============================================================
CREATE TABLE provider_staff (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  canteen_id    UUID REFERENCES canteens(id),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(100),  -- Chef cuisinier, Service salle...
  shift_name    VARCHAR(50),
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMANDES FOURNISSEURS (prestataire)
-- ============================================================
CREATE TABLE supplier_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id   UUID NOT NULL REFERENCES providers(id),
  supplier_name VARCHAR(255) NOT NULL,
  products      TEXT,
  quantity_kg   DECIMAL(10,2),
  delivery_date DATE,
  amount_mga    INTEGER,
  status        VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RAPPORTS MENSUELS (cache calculé)
-- ============================================================
CREATE TABLE monthly_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  canteen_id      UUID REFERENCES canteens(id),
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_checkins  INTEGER DEFAULT 0,
  monthly_quota   INTEGER DEFAULT 0,
  savings_mga     BIGINT DEFAULT 0,
  commission_mga  BIGINT DEFAULT 0,
  is_paid         BOOLEAN DEFAULT false,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, canteen_id, year, month)
);

-- ============================================================
-- DONNÉES DE DÉMO
-- ============================================================
INSERT INTO companies (id, name, logo_initials, address, city, monthly_quota, meal_price, status)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'TelmaCall Center',  'TC', 'Rue Rainitovo, Ankorondrano', 'Antananarivo', 9000, 5267, 'active'),
  ('11111111-0000-0000-0000-000000000002', 'Groupe Socota',     'GS', 'Zone Franche, Tanjombato',   'Antananarivo', 5800, 5017, 'active'),
  ('11111111-0000-0000-0000-000000000003', 'BNI Madagascar',    'BN', 'Antaninarenina',              'Antananarivo', 4700, 4872, 'pilot');

INSERT INTO providers (id, name, contact_email, contact_phone)
VALUES ('22222222-0000-0000-0000-000000000001', 'Resto''Pro SARL', 'contact@restopro.mg', '+261 34 00 000 01');

INSERT INTO canteens (id, company_id, name, location, is_open)
VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Cantine principale', 'Bâtiment A – RDC', true),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Cantine zone franche', 'Entrée principale', true),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Cafétéria siège',    'Bâtiment principal', true);

INSERT INTO shifts (id, canteen_id, name, start_time, end_time)
VALUES
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Matin', '06:00', '11:30'),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'Midi',  '11:30', '13:30'),
  ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'Soir',  '17:00', '20:00'),
  ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'Nuit',  '22:00', '05:00');

-- Mot de passe = "password123" (bcrypt hash)
INSERT INTO users (email, password_hash, first_name, last_name, role, company_id)
VALUES
  ('admin@cantinetrack.mg',    '$2b$10$rOzJqrjqJqrjqJqrjqJqrO', 'Admin',  'Système',  'admin',       NULL),
  ('drh@telma.mg',             '$2b$10$rOzJqrjqJqrjqJqrjqJqrO', 'Marie',  'Ratsima',  'drh',         '11111111-0000-0000-0000-000000000001'),
  ('prestataire@restopro.mg',  '$2b$10$rOzJqrjqJqrjqJqrjqJqrO', 'Jean',   'Rakoto',   'prestataire', NULL),
  ('tablette@telma.mg',        '$2b$10$rOzJqrjqJqrjqJqrjqJqrO', 'Tablette','Cantine', 'tablette',    '11111111-0000-0000-0000-000000000001');
