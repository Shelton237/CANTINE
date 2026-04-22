-- CantineTrack — Enrichissement Complet (Demo Réelle) - FIX SCHEMA
-- À exécuter : psql $DATABASE_URL -f backend/db/enrich_data_full.sql

DO $$
DECLARE
    -- IDs des Entités
    telma_id UUID := '11111111-0000-0000-0000-000000000001';
    socota_id UUID := '11111111-0000-0000-0000-000000000002';
    bni_id UUID := '11111111-0000-0000-0000-000000000003';
    
    telma_canteen UUID := '33333333-0000-0000-0000-000000000001';
    socota_canteen UUID := '33333333-0000-0000-0000-000000000002';
    bni_canteen UUID := '33333333-0000-0000-0000-000000000003';
    
    provider_id UUID := '22222222-0000-0000-0000-000000000001';
    
    -- Listes pour génération aléatoire
    first_names TEXT[] := ARRAY['Andry', 'Mamy', 'Nivo', 'Fara', 'Tiana', 'Solo', 'Hery', 'Tina', 'Rindra', 'Lova', 'Jean', 'Marie', 'Hasina', 'Toky', 'Tahina', 'Luc', 'Sophie', 'Alain', 'Vola', 'Landry', 'Zo', 'Fitia', 'Mino', 'Naina', 'Bakoly'];
    last_names TEXT[] := ARRAY['Rakoto', 'Rabe', 'Andry', 'Rafeno', 'Ranaivo', 'Rasolo', 'Randria', 'Rajo', 'Andria', 'Ralambo', 'Razafy', 'Raman', 'Ramar', 'Ratsima', 'Rakoton', 'Rasamy', 'Andriamaro', 'Bako', 'Randrianary', 'Rasoa'];
    depts TEXT[] := ARRAY['IT', 'RH', 'Finance', 'Logistique', 'Comptabilité', 'Ventes', 'Marketing', 'Opérations', 'Maintenance', 'Qualité', 'Support'];
    dish_names TEXT[] := ARRAY['Ravitoto sy Hena kisoa', 'Hen''omby ritra', 'Poulet sauce Curry', 'Mine-Sao spécial', 'Romazava Royal', 'Viky-Viky au poisson', 'Steak frites', 'Lasary voatabia sy laoka'];
    
    -- Variables boucle
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
    pin_h TEXT := '$2b$10$U0Y4KCTjkWMrPEuvE8/TReu5tqVi7VZSqFWf7ZbL1OFBlhB4nUjYq'; -- password123
BEGIN
    RAISE NOTICE '--- Début de l''enrichissement de données ---';

    -- 1. Liaison Cantines-Prestataires
    RAISE NOTICE '1. Liaison Cantines-Prestataires...';
    INSERT INTO canteen_providers (canteen_id, provider_id, contract_start)
    VALUES (telma_canteen, provider_id, '2025-01-01'),
           (socota_canteen, provider_id, '2025-01-01'),
           (bni_canteen, provider_id, '2025-01-01')
    ON CONFLICT DO NOTHING;

    -- 2. Récupérer les shifts
    SELECT ARRAY_AGG(id) INTO shifts_ids FROM shifts;
    
    -- 3. Création des Employés (120+)
    RAISE NOTICE '2. Création de 120 Employés réalistes...';
    FOR i IN 1..120 LOOP
        IF i <= 50 THEN curr_company := telma_id;
        ELSIF i <= 85 THEN curr_company := socota_id;
        ELSE curr_company := bni_id;
        END IF;

        INSERT INTO employees (company_id, matricule, first_name, last_name, email, department, shift_id, access_method, pin_hash, qr_code)
        VALUES (
            curr_company,
            'EMP-' || LPAD(i::text, 5, '0'),
            first_names[1 + floor(random() * array_length(first_names, 1))],
            last_names[1 + floor(random() * array_length(last_names, 1))],
            LOWER('user' || i || '@test-cantinetrack.com'),
            depts[1 + floor(random() * array_length(depts, 1))],
            shifts_ids[1 + floor(random() * array_length(shifts_ids, 1))],
            CASE WHEN i % 5 = 0 THEN 'pin' ELSE 'qr' END,
            pin_h,
            'QR-' || UPPER(substring(md5(random()::text) from 1 for 10))
        )
        RETURNING id INTO curr_emp;
        emp_ids := array_append(emp_ids, curr_emp);
    END LOOP;

    -- 4. Menus Hebdomadaires
    RAISE NOTICE '3. Génération des Menus...';
    FOR i IN 0..2 LOOP -- 3 semaines
        FOR j IN 1..7 LOOP -- 7 jours
            INSERT INTO menus (canteen_id, service_date, name, description, menu_type, portions_planned)
            VALUES 
                (telma_canteen, CURRENT_DATE + (i*7 + j - 10)*interval'1 day', dish_names[1 + floor(random() * 8)], 'Plat traditionnel malgache', 'standard', 100),
                (socota_canteen, CURRENT_DATE + (i*7 + j - 10)*interval'1 day', dish_names[1 + floor(random() * 8)], 'Option végétarienne disponible', 'standard', 80),
                (bni_canteen, CURRENT_DATE + (i*7 + j - 10)*interval'1 day', dish_names[1 + floor(random() * 8)], 'Menu Premium', 'premium', 50)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- 5. Historique des Scans (Checkins) - 60 jours
    RAISE NOTICE '4. Génération de 5000+ Scans historiques...';
    FOR d IN (SELECT generate_series(CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE, INTERVAL '1 day')::date) LOOP
        CONTINUE WHEN extract(dow from d) IN (0, 6) AND random() > 0.2;

        FOREACH curr_emp IN ARRAY emp_ids LOOP
            IF random() < 0.85 THEN
                SELECT CASE 
                    WHEN company_id = telma_id THEN telma_canteen
                    WHEN company_id = socota_id THEN socota_canteen
                    ELSE bni_canteen
                END, company_id INTO curr_canteen, curr_company FROM employees WHERE id = curr_emp;

                h := 11 + floor(random() * 3);
                IF h = 11 THEN m := 40 + floor(random() * 20);
                ELSIF h = 12 THEN m := floor(random() * 60);
                ELSE m := floor(random() * 20);
                END IF;

                INSERT INTO checkins (employee_id, canteen_id, access_method, status, checked_at)
                VALUES (curr_emp, curr_canteen, 'qr', 'approved', d + (h || ' hours ' || m || ' minutes')::interval);
            END IF;
        END LOOP;
    END LOOP;

    -- 6. Factures DAF Mensuelles (Janvier 2026 à aujourd'hui)
    RAISE NOTICE '5. Génération des rapports financiers...';
    FOR i IN 1..3 LOOP
        INSERT INTO invoices (company_id, canteen_id, provider_id, year, month, monthly_quota, actual_checkins, meal_price, status)
        VALUES 
            (telma_id, telma_canteen, provider_id, 2026, i, 1200, 1050 + floor(random()*50), 12000, 'paid'),
            (socota_id, socota_canteen, provider_id, 2026, i, 800, 680 + floor(random()*40), 11500, 'validated')
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Calculs automatiques des montants des factures
    UPDATE invoices SET 
        forfait_mga = monthly_quota * meal_price,
        actual_mga = actual_checkins * meal_price,
        savings_mga = CASE WHEN (monthly_quota - actual_checkins) > 0 THEN (monthly_quota - actual_checkins) * meal_price ELSE 0 END,
        commission_mga = CASE WHEN (monthly_quota - actual_checkins) > 0 THEN ((monthly_quota - actual_checkins) * meal_price) * 0.1 ELSE 0 END,
        net_savings_mga = CASE WHEN (monthly_quota - actual_checkins) > 0 THEN ((monthly_quota - actual_checkins) * meal_price) * 0.9 ELSE 0 END;

    -- 7. Alertes Système récentes
    RAISE NOTICE '6. Génération des Alertes...';
    INSERT INTO alerts (company_id, canteen_id, type, severity, title, message)
    VALUES 
    (telma_id, telma_canteen, 'doublon', 'warning', 'Double scan détecté', 'L''employé EMP-00012 a tenté de scanner deux fois à 12h15.'),
    (socota_id, socota_canteen, 'hors_horaire', 'critical', 'Accès interdit - Hors shift', 'L''employé EMP-00067 a scanné à 16h45 pour le service midi.'),
    (bni_id, bni_canteen, 'badge_inconnu', 'info', 'Tentative badge inconnu', 'Un tag NFC non référencé a été présenté à la Borne 2.'),
    (telma_id, telma_canteen, 'quota_warning', 'warning', 'Quota mensuel approchant (80%)', 'Le TelmaCall Center a consommé 80% de son quota forfaitaire pour Mars 2026.');

    RAISE NOTICE '--- Enrichissement Terminé avec Succès ---';
END $$;
