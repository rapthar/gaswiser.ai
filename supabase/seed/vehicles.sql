-- Gas Wiser Vehicle Database Seed
-- EPA-sourced fuel economy data for top US/Canada vehicles
-- Source: fueleconomy.gov (2022-2024 model years)

INSERT INTO vehicle_db (make, model, year, trim, mpg_city, mpg_highway, mpg_combined, l_per_100km, tank_size_gallons, fuel_type, source, verified)
VALUES
-- ── FORD ─────────────────────────────────────────────────────────────────────
('Ford', 'F-150',          2023, 'XLT 2.7L EcoBoost',    20, 26, 23, 10.2, 26.0, 'gasoline', 'epa', true),
('Ford', 'F-150',          2023, 'Raptor 3.5L V6',        15, 18, 16, 14.7, 36.0, 'gasoline', 'epa', true),
('Ford', 'F-150',          2022, 'XLT 5.0L V8',           17, 23, 19, 12.4, 26.0, 'gasoline', 'epa', true),
('Ford', 'Explorer',       2023, 'XLT 2.3L',              21, 28, 24, 9.8,  18.0, 'gasoline', 'epa', true),
('Ford', 'Escape',         2023, 'SE 1.5L',               28, 34, 30, 7.8,  15.7, 'gasoline', 'epa', true),
('Ford', 'Maverick',       2023, 'XL Hybrid',             42, 33, 37, 6.4,  13.8, 'hybrid',   'epa', true),
('Ford', 'Bronco',         2023, 'Big Bend 2.3L',         20, 22, 21, 11.2, 16.9, 'gasoline', 'epa', true),
('Ford', 'Mustang',        2023, 'GT 5.0L V8',            15, 24, 18, 13.1, 16.0, 'gasoline', 'epa', true),
('Ford', 'Edge',           2023, 'SEL 2.0L',              21, 29, 24, 9.8,  19.2, 'gasoline', 'epa', true),
('Ford', 'Ranger',         2023, 'XLT 2.3L',              21, 26, 23, 10.2, 20.0, 'gasoline', 'epa', true),
('Ford', 'Transit',        2023, '250 3.5L EcoBoost',     15, 20, 17, 13.8, 25.0, 'gasoline', 'epa', true),

-- ── CHEVROLET ────────────────────────────────────────────────────────────────
('Chevrolet', 'Silverado 1500', 2023, 'LT 5.3L V8',        16, 23, 19, 12.4, 24.0, 'gasoline', 'epa', true),
('Chevrolet', 'Silverado 1500', 2023, 'Trail Boss 5.3L',    14, 20, 16, 14.7, 24.0, 'gasoline', 'epa', true),
('Chevrolet', 'Equinox',        2024, 'LT 1.5L',            26, 31, 28, 8.4,  14.9, 'gasoline', 'epa', true),
('Chevrolet', 'Traverse',       2023, 'LT Cloth 3.6L V6',   18, 27, 21, 11.2, 21.7, 'gasoline', 'epa', true),
('Chevrolet', 'Colorado',       2023, 'LT 2.7L',            17, 24, 20, 11.8, 20.7, 'gasoline', 'epa', true),
('Chevrolet', 'Blazer',         2023, 'LT 2.0L',            22, 29, 25, 9.4,  19.4, 'gasoline', 'epa', true),
('Chevrolet', 'Trax',           2024, 'LT 1.2L Turbo',      28, 32, 30, 7.8,  12.9, 'gasoline', 'epa', true),
('Chevrolet', 'Tahoe',          2023, 'LT 5.3L V8',         15, 20, 17, 13.8, 28.0, 'gasoline', 'epa', true),
('Chevrolet', 'Suburban',       2023, 'LT 5.3L V8',         14, 19, 16, 14.7, 31.0, 'gasoline', 'epa', true),
('Chevrolet', 'Malibu',         2023, 'LT 1.5L',            29, 36, 32, 7.4,  15.8, 'gasoline', 'epa', true),
('Chevrolet', 'Camaro',         2023, 'SS 6.2L V8',         13, 21, 16, 14.7, 19.0, 'gasoline', 'epa', true),

-- ── RAM ──────────────────────────────────────────────────────────────────────
('Ram', '1500',         2023, 'Big Horn 3.6L V6',    17, 25, 20, 11.8, 23.0, 'gasoline', 'epa', true),
('Ram', '1500',         2023, 'Laramie 5.7L HEMI',   15, 22, 18, 13.1, 26.0, 'gasoline', 'epa', true),
('Ram', '1500 Classic', 2023, 'Tradesman 3.6L V6',   16, 23, 19, 12.4, 26.0, 'gasoline', 'epa', true),
('Ram', '2500',         2023, 'Tradesman 6.4L HEMI', 11, 16, 13, 18.1, 32.0, 'gasoline', 'epa', true),
('Ram', 'ProMaster',    2023, '1500 3.6L V6',        15, 20, 17, 13.8, 24.6, 'gasoline', 'epa', true),

-- ── TOYOTA ───────────────────────────────────────────────────────────────────
('Toyota', 'Camry',       2023, 'LE 2.5L',              28, 39, 32, 7.4,  14.5, 'gasoline', 'epa', true),
('Toyota', 'Camry',       2023, 'XSE Hybrid',           51, 53, 52, 4.5,  13.2, 'hybrid',   'epa', true),
('Toyota', 'Corolla',     2023, 'LE 1.8L',              31, 40, 35, 6.7,  13.2, 'gasoline', 'epa', true),
('Toyota', 'RAV4',        2023, 'XLE 2.5L',             27, 35, 30, 7.8,  14.5, 'gasoline', 'epa', true),
('Toyota', 'RAV4 Hybrid', 2023, 'XLE Hybrid',           41, 38, 40, 5.9,  14.5, 'hybrid',   'epa', true),
('Toyota', 'Highlander',  2023, 'L 3.5L V6',            21, 29, 24, 9.8,  17.1, 'gasoline', 'epa', true),
('Toyota', 'Tacoma',      2023, 'SR 2.7L',              20, 23, 21, 11.2, 21.1, 'gasoline', 'epa', true),
('Toyota', 'Tacoma',      2023, 'TRD Off-Road 3.5L V6', 18, 22, 20, 11.8, 21.1, 'gasoline', 'epa', true),
('Toyota', 'Tundra',      2023, 'SR 3.5L V6 Twin Turbo',17, 22, 19, 12.4, 22.5, 'gasoline', 'epa', true),
('Toyota', '4Runner',     2023, 'SR5 4.0L V6',          16, 19, 17, 13.8, 23.0, 'gasoline', 'epa', true),
('Toyota', 'Sienna',      2023, 'LE Hybrid',             35, 36, 36, 6.5,  18.0, 'hybrid',   'epa', true),
('Toyota', 'Prius',       2023, 'LE 2.0L Hybrid',       57, 56, 57, 4.1,  11.3, 'hybrid',   'epa', true),

-- ── HONDA ────────────────────────────────────────────────────────────────────
('Honda', 'Accord',    2023, 'LX 1.5L Turbo',          29, 37, 32, 7.4,  14.8, 'gasoline', 'epa', true),
('Honda', 'Accord',    2023, 'Hybrid EX',               44, 41, 43, 5.5,  12.4, 'hybrid',   'epa', true),
('Honda', 'Civic',     2023, 'LX 2.0L',                31, 40, 35, 6.7,  12.4, 'gasoline', 'epa', true),
('Honda', 'CR-V',      2023, 'LX 1.5L Turbo',          28, 34, 30, 7.8,  14.0, 'gasoline', 'epa', true),
('Honda', 'CR-V',      2023, 'EX-L Hybrid',             40, 34, 37, 6.4,  14.0, 'hybrid',   'epa', true),
('Honda', 'Pilot',     2023, 'Sport 3.5L V6',           20, 27, 23, 10.2, 19.5, 'gasoline', 'epa', true),
('Honda', 'Odyssey',   2023, 'LX 3.5L V6',             19, 28, 22, 10.7, 21.0, 'gasoline', 'epa', true),
('Honda', 'Ridgeline', 2023, 'Sport 3.5L V6',           18, 24, 21, 11.2, 19.5, 'gasoline', 'epa', true),
('Honda', 'HR-V',      2023, 'LX 2.0L',                26, 32, 28, 8.4,  12.4, 'gasoline', 'epa', true),
('Honda', 'Passport',  2023, 'Sport 3.5L V6',           20, 25, 22, 10.7, 19.5, 'gasoline', 'epa', true),

-- ── GMC ──────────────────────────────────────────────────────────────────────
('GMC', 'Sierra 1500', 2023, 'SLE 5.3L V8',     16, 23, 19, 12.4, 24.0, 'gasoline', 'epa', true),
('GMC', 'Terrain',     2023, 'SLE 1.5L',         26, 31, 28, 8.4,  15.6, 'gasoline', 'epa', true),
('GMC', 'Yukon',       2023, 'SLE 5.3L V8',      15, 20, 17, 13.8, 28.0, 'gasoline', 'epa', true),
('GMC', 'Canyon',      2023, 'SLE 2.7L',         17, 24, 20, 11.8, 20.0, 'gasoline', 'epa', true),
('GMC', 'Acadia',      2023, 'SLE 2.0L',         19, 26, 22, 10.7, 19.0, 'gasoline', 'epa', true),

-- ── NISSAN ───────────────────────────────────────────────────────────────────
('Nissan', 'Rogue',    2023, 'S 1.5L VC-Turbo',   30, 37, 33, 7.1, 14.5, 'gasoline', 'epa', true),
('Nissan', 'Altima',   2023, 'S 2.5L',             28, 39, 32, 7.4, 16.2, 'gasoline', 'epa', true),
('Nissan', 'Sentra',   2023, 'S 2.0L',             29, 39, 33, 7.1, 12.4, 'gasoline', 'epa', true),
('Nissan', 'Pathfinder',2023,'S 3.5L V6',          20, 27, 23, 10.2,19.5, 'gasoline', 'epa', true),
('Nissan', 'Frontier', 2023, 'S 3.8L V6',          18, 24, 20, 11.8, 21.0, 'gasoline', 'epa', true),
('Nissan', 'Titan',    2023, 'S 5.6L V8',          15, 21, 17, 13.8, 28.0, 'gasoline', 'epa', true),
('Nissan', 'Kicks',    2023, 'S 1.6L',             31, 36, 33, 7.1, 13.2, 'gasoline', 'epa', true),
('Nissan', 'Murano',   2023, 'S 3.5L V6',          20, 28, 23, 10.2, 20.0, 'gasoline', 'epa', true),

-- ── JEEP ─────────────────────────────────────────────────────────────────────
('Jeep', 'Wrangler',          2023, 'Sport 3.6L V6',       17, 23, 20, 11.8, 21.5, 'gasoline', 'epa', true),
('Jeep', 'Grand Cherokee',    2023, 'Laredo 3.6L V6',      19, 26, 22, 10.7, 24.6, 'gasoline', 'epa', true),
('Jeep', 'Cherokee',          2023, 'Latitude 2.0L Turbo', 22, 31, 25, 9.4,  15.9, 'gasoline', 'epa', true),
('Jeep', 'Compass',           2023, 'Sport 2.4L',          22, 30, 25, 9.4,  13.5, 'gasoline', 'epa', true),
('Jeep', 'Gladiator',         2023, 'Sport 3.6L V6',       16, 23, 19, 12.4, 22.0, 'gasoline', 'epa', true),
('Jeep', 'Grand Cherokee 4xe',2023, 'Trailhawk PHEV',      23, 25, 24, 9.8,  17.2, 'hybrid',   'epa', true),

-- ── HYUNDAI ──────────────────────────────────────────────────────────────────
('Hyundai', 'Tucson',    2023, 'SEL 2.5L',           26, 33, 29, 8.1,  14.3, 'gasoline', 'epa', true),
('Hyundai', 'Santa Fe',  2023, 'SE 2.5L',             22, 29, 25, 9.4,  16.3, 'gasoline', 'epa', true),
('Hyundai', 'Elantra',   2023, 'SE 2.0L',             33, 43, 37, 6.4,  14.0, 'gasoline', 'epa', true),
('Hyundai', 'Sonata',    2023, 'SE 2.5L',             28, 38, 32, 7.4,  18.8, 'gasoline', 'epa', true),
('Hyundai', 'Palisade',  2023, 'SE 3.8L V6',          19, 26, 22, 10.7, 18.8, 'gasoline', 'epa', true),
('Hyundai', 'Kona',      2023, 'SE 2.0L',             27, 33, 29, 8.1,  13.2, 'gasoline', 'epa', true),
('Hyundai', 'Venue',     2023, 'SE 1.6L',             29, 33, 31, 7.6,  11.9, 'gasoline', 'epa', true),

-- ── KIA ──────────────────────────────────────────────────────────────────────
('Kia', 'Sportage',  2023, 'LX 2.5L',            24, 29, 26, 9.1, 14.3, 'gasoline', 'epa', true),
('Kia', 'Telluride', 2023, 'LX 3.8L V6',         20, 26, 23, 10.2,18.8, 'gasoline', 'epa', true),
('Kia', 'Sorento',   2023, 'LX 2.5L',            24, 29, 26, 9.1, 16.3, 'gasoline', 'epa', true),
('Kia', 'Soul',      2023, 'LX 2.0L',            28, 33, 30, 7.8, 14.3, 'gasoline', 'epa', true),
('Kia', 'Forte',     2023, 'LXS 2.0L',           29, 38, 33, 7.1, 14.0, 'gasoline', 'epa', true),
('Kia', 'K5',        2023, 'LXS 1.6T',           29, 38, 33, 7.1, 16.3, 'gasoline', 'epa', true),
('Kia', 'Carnival',  2023, 'LX 3.5L V6',         19, 27, 22, 10.7,21.1, 'gasoline', 'epa', true),

-- ── SUBARU ───────────────────────────────────────────────────────────────────
('Subaru', 'Outback',   2023, 'Base 2.5L',       26, 33, 29, 8.1, 18.5, 'gasoline', 'epa', true),
('Subaru', 'Forester',  2023, 'Base 2.5L',       26, 33, 29, 8.1, 16.6, 'gasoline', 'epa', true),
('Subaru', 'Crosstrek', 2023, 'Base 2.0L',       27, 34, 30, 7.8, 15.9, 'gasoline', 'epa', true),
('Subaru', 'Impreza',   2023, 'Base 2.0L',       28, 36, 31, 7.6, 13.2, 'gasoline', 'epa', true),
('Subaru', 'Ascent',    2023, 'Base 2.4L Turbo', 21, 27, 24, 9.8, 19.3, 'gasoline', 'epa', true),

-- ── VOLKSWAGEN ───────────────────────────────────────────────────────────────
('Volkswagen', 'Jetta',   2023, 'S 1.5L Turbo',  29, 42, 34, 6.9, 13.2, 'gasoline', 'epa', true),
('Volkswagen', 'Tiguan',  2023, 'S 2.0L Turbo',  23, 30, 26, 9.1, 15.9, 'gasoline', 'epa', true),
('Volkswagen', 'Atlas',   2023, 'S 2.0T',         21, 25, 23, 10.2,19.9, 'gasoline', 'epa', true),
('Volkswagen', 'Taos',    2023, 'S 1.5L Turbo',  28, 36, 31, 7.6, 12.4, 'gasoline', 'epa', true),

-- ── BMW ──────────────────────────────────────────────────────────────────────
('BMW', 'X3',      2023, 'sDrive30i 2.0L Turbo', 25, 34, 29, 8.1, 17.2, 'gasoline', 'epa', true),
('BMW', '3 Series',2023, '330i 2.0L Turbo',       26, 36, 30, 7.8, 15.6, 'gasoline', 'epa', true),
('BMW', 'X5',      2023, 'xDrive40i 3.0L Turbo', 21, 26, 23, 10.2,21.9, 'gasoline', 'epa', true),

-- ── MERCEDES ─────────────────────────────────────────────────────────────────
('Mercedes-Benz', 'GLE', 2023, '350 2.0L Turbo', 20, 26, 22, 10.7, 21.1, 'gasoline', 'epa', true),
('Mercedes-Benz', 'C-Class', 2023, 'C 300 2.0L', 23, 34, 27, 8.7, 15.6, 'gasoline', 'epa', true),

-- ── TESLA ────────────────────────────────────────────────────────────────────
('Tesla', 'Model 3',  2023, 'RWD Long Range', NULL, NULL, NULL, NULL, NULL, 'electric', 'epa', true),
('Tesla', 'Model Y',  2023, 'Long Range AWD',  NULL, NULL, NULL, NULL, NULL, 'electric', 'epa', true),
('Tesla', 'Model S',  2023, 'Dual Motor AWD',  NULL, NULL, NULL, NULL, NULL, 'electric', 'epa', true),
('Tesla', 'Cybertruck',2024,'AWD',              NULL, NULL, NULL, NULL, NULL, 'electric', 'epa', true),

-- ── CANADIAN-MARKET VEHICLES (NRCan data, L/100km primary) ───────────────────
('Ford',       'F-150',       2023, 'XLT 2.7L EcoBoost (CAN)', 11.8, 9.0, 10.4, 10.4, 98.4, 'gasoline', 'nrcan', true),
('Chevrolet',  'Silverado',   2023, 'LT 5.3L (CAN)',            14.7, 10.2,12.4, 12.4, 90.8, 'gasoline', 'nrcan', true),
('Toyota',     'RAV4',        2023, 'XLE AWD (CAN)',              9.2, 7.6,  8.3,  8.3, 54.9, 'gasoline', 'nrcan', true),
('Honda',      'CR-V',        2023, 'LX FWD (CAN)',               9.4, 7.4,  8.5,  8.5, 53.0, 'gasoline', 'nrcan', true),
('Hyundai',    'Tucson',      2023, 'Essential FWD (CAN)',         9.8, 7.6,  8.9,  8.9, 54.1, 'gasoline', 'nrcan', true),
('Jeep',       'Grand Cherokee',2023,'Laredo (CAN)',              12.4, 8.9, 10.9, 10.9, 93.1, 'gasoline', 'nrcan', true),
('Ram',        '1500',        2023, 'Express 3.6L (CAN)',         13.8, 9.4, 11.9, 11.9, 87.1, 'gasoline', 'nrcan', true),
('Kia',        'Sportage',    2023, 'LX FWD (CAN)',                9.5, 7.7,  8.7,  8.7, 54.1, 'gasoline', 'nrcan', true)

ON CONFLICT (year, make, model, COALESCE(trim, '')) DO NOTHING;
