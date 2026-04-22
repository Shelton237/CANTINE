-- Script pour réinitialiser et créer les cantines avec les IDs de démo
BEGIN;

-- Nettoyage des tables dépendantes
DELETE FROM invoices;
DELETE FROM checkins;
DELETE FROM employee_schedules;
DELETE FROM alerts;
DELETE FROM employees;
DELETE FROM provider_staff;
DELETE FROM menus;
DELETE FROM canteen_providers;
DELETE FROM shifts;

-- Suppression des anciennes cantines pour éviter les conflits
DELETE FROM canteens;

-- 1. S'assurer que le prestataire attendu existe
INSERT INTO providers (id, name, contact_email)
VALUES ('e0000000-0000-0000-0000-000000000001', 'Resto''Pro SARL', 'contact@restopro.mg')
ON CONFLICT (id) DO NOTHING;

-- 2. Créer les cantines Telma, Socota, BNI avec les IDs 'c0000000-...'
INSERT INTO canteens (id, company_id, name, location, is_open)
VALUES
  ('c0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Cantine principale (Telma)', 'Bâtiment A – RDC', true),
  ('c0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Cantine zone franche (Socota)', 'Entrée principale', true),
  ('c0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Cafétéria siège (BNI)', 'Bâtiment principal', true);

-- 3. Lier les cantines au prestataire
INSERT INTO canteen_providers (canteen_id, provider_id, contract_start)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', CURRENT_DATE);

-- 4. Recréer les shifts pour les nouvelles cantines
INSERT INTO shifts (id, canteen_id, name, start_time, end_time, tolerance_min, days_of_week)
VALUES 
  ('44444444-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Matin', '06:00', '11:30', 15, '{1,2,3,4,5,6}'),
  ('44444444-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Midi',  '11:30', '13:30', 10, '{1,2,3,4,5}'),
  ('44444444-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Soir',  '17:00', '20:00', 20, '{1,2,3,4,5,6}'),
  ('44444444-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Nuit',  '22:00', '05:00', 30, '{1,2,3,4,5,6,7}');

COMMIT;
