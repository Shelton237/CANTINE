-- CantineTrack — Enrichissement de données réelles (Demo)
-- À exécuter : psql $DATABASE_URL -f backend/db/enrich_data.sql

DO $$
DECLARE
    telma_id UUID := '11111111-0000-0000-0000-000000000001';
    socota_id UUID := '11111111-0000-0000-0000-000000000002';
    bni_id UUID := '11111111-0000-0000-0000-000000000003';
    telma_canteen UUID := 'c0000000-0000-0000-0000-000000000001';
    socota_canteen UUID := 'c0000000-0000-0000-0000-000000000002';
    bni_canteen UUID := 'c0000000-0000-0000-0000-000000000003';
    provider_id UUID := 'e0000000-0000-0000-0000-000000000001';
    first_names TEXT[] := ARRAY['Andry', 'Mamy', 'Nivo', 'Fara', 'Tiana', 'Solo', 'Hery', 'Tina', 'Rindra', 'Lova', 'Jean', 'Marie', 'Hasina', 'Toky', 'Tahina'];
    last_names TEXT[] := ARRAY['Rakoto', 'Rabe', 'Andry', 'Rafeno', 'Ranaivo', 'Rasolo', 'Randria', 'Rajo', 'Andria', 'Ralambo', 'Razafy', 'Raman', 'Ramar', 'Ratsima', 'Rakoton'];
    depts TEXT[] := ARRAY['IT', 'RH', 'Finance', 'Logistique', 'Comptabilité', 'Ventes', 'Marketing', 'Opérations', 'Maintenance'];
    shifts_ids UUID[];
    emp_ids UUID[];
    curr_emp UUID;
    curr_canteen UUID;
    curr_company UUID;
    i INTEGER;
    j INTEGER;
    d DATE;
    h INTEGER;
    m INTEGER;
    pin_h TEXT := '$2b$10$U0Y4KCTjkWMrPEuvE8/TReu5tqVi7VZSqFWf7ZbL1OFBlhB4nUjYq'; -- password123 (hashed for employees PIN)
BEGIN
    -- 0. Nettoyage partiel (Optionnel, ici on garde les existants)
    -- DELETE FROM checkins;
    -- DELETE FROM employees WHERE email NOT IN ('admin@cantinetrack.mg');

    -- 1. Récupérer les IDs de shifts existants
    SELECT ARRAY_AGG(id) INTO shifts_ids FROM shifts;

    -- 2. Créer 30 employés pour Telma, 20 pour Socota, 20 pour BNI
    RAISE NOTICE 'Création des employés...';
    FOR i IN 1..70 LOOP
        IF i <= 30 THEN 
            curr_company := telma_id;
        ELSIF i <= 50 THEN 
            curr_company := socota_id;
        ELSE 
            curr_company := bni_id;
        END IF;

        INSERT INTO employees (company_id, matricule, first_name, last_name, email, department, shift_id, access_method, pin_hash, qr_code)
        VALUES (
            curr_company,
            'EMP-' || LPAD(i::text, 4, '0'),
            first_names[1 + floor(random() * array_length(first_names, 1))],
            last_names[1 + floor(random() * array_length(last_names, 1))],
            LOWER('emp' || i || '@demo.mg'),
            depts[1 + floor(random() * array_length(depts, 1))],
            shifts_ids[1 + floor(random() * array_length(shifts_ids, 1))],
            'qr',
            pin_h,
            'QR-' || UPPER(substring(md5(random()::text) from 1 for 10))
        )
        RETURNING id INTO curr_emp;
        
        emp_ids := array_append(emp_ids, curr_emp);
    END LOOP;

    -- 3. Générer des checkins pour les 30 derniers jours
    RAISE NOTICE 'Génération des scans historiques (30 jours)...';
    FOR d IN (SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day')::date) LOOP
        -- On ne scanne pas trop les weekends (sauf shift nuit)
        CONTINUE WHEN extract(dow from d) IN (0, 6) AND random() > 0.3;

        -- Pour chaque employé, 80% de chance qu'il mange
        FOREACH curr_emp IN ARRAY emp_ids LOOP
            IF random() < 0.85 THEN
                -- Trouver sa cantine
                SELECT CASE 
                    WHEN company_id = telma_id THEN telma_canteen
                    WHEN company_id = socota_id THEN socota_canteen
                    ELSE bni_canteen
                END INTO curr_canteen FROM employees WHERE id = curr_emp;

                -- Heure de repas vers midi (11h45 - 13h15)
                h := 11 + floor(random() * 3);
                IF h = 11 THEN m := 45 + floor(random() * 15);
                ELSIF h = 12 THEN m := floor(random() * 60);
                ELSE m := floor(random() * 15);
                END IF;

                INSERT INTO checkins (employee_id, canteen_id, access_method, status, checked_at)
                VALUES (curr_emp, curr_canteen, 'qr', 'approved', d + (h || ' hours ' || m || ' minutes')::interval);
            END IF;
        END LOOP;
    END LOOP;

    -- 4. Générer des factures historiques (Janvier / Février / Mars 2026)
    RAISE NOTICE 'Génération des factures DAF...';
    FOR i IN 1..3 LOOP
        -- Telma
        INSERT INTO invoices (company_id, canteen_id, provider_id, year, month, monthly_quota, actual_checkins, meal_price, forfait_mga, actual_mga, savings_mga, commission_mga, net_savings_mga, status)
        VALUES (telma_id, telma_canteen, provider_id, 2026, i, 900, 750 + floor(random() * 100), 12000, 10800000, 9000000 + floor(random()*1000000), 0, 0, 0, 'validated')
        ON CONFLICT DO NOTHING;
        
        -- Socota
        INSERT INTO invoices (company_id, canteen_id, provider_id, year, month, monthly_quota, actual_checkins, meal_price, forfait_mga, actual_mga, savings_mga, commission_mga, net_savings_mga, status)
        VALUES (socota_id, socota_canteen, provider_id, 2026, i, 600, 480 + floor(random() * 50), 11500, 6900000, 5520000 + floor(random()*500000), 0, 0, 0, 'validated')
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Calculer les montants des factures (on le fait via UPDATE car TRIGGER peut manquer en SQL pur si non défini)
    UPDATE invoices SET 
        forfait_mga = monthly_quota * meal_price,
        actual_mga = actual_checkins * meal_price,
        savings_mga = (monthly_quota - actual_checkins) * meal_price,
        commission_mga = ((monthly_quota - actual_checkins) * meal_price) * 0.1, -- 10% commission
        net_savings_mga = ((monthly_quota - actual_checkins) * meal_price) * 0.9;

    -- 5. Quelques alertes récentes
    RAISE NOTICE 'Génération des alertes...';
    INSERT INTO alerts (company_id, canteen_id, type, severity, title, message)
    VALUES 
    (telma_id, telma_canteen, 'doublon', 'warning', 'Tentative de doublon', 'L''employé EMP-0005 a tenté de biper deux fois aujourd''hui.'),
    (socota_id, socota_canteen, 'hors_horaire', 'info', 'Scan hors créneau', 'L''employé EMP-0032 a scanné à 14h15 (Shift Midi finit à 14h00).'),
    (telma_id, telma_canteen, 'badge_inconnu', 'critical', 'Badge non reconnu', 'Un badge NFC inconnu a été présenté sur la tablette Kiosque-01.');

END $$;
