-- Medicine
-- Seeds 153 commonly prescribed medicines across 14 therapeutic categories for local
-- development and testing (business spec section 5, database-spec.md section 3.1).
-- MedicineCode is used as the natural key for the MERGE match, since it is client-
-- supplied and unique per the approved API spec (unlike Patient.PatientNumber, which is
-- server-generated) - this keeps the script idempotent (safe to re-run) without
-- depending on identity values.
--
-- MedicineFormId/MedicineRouteId are resolved from the existing dbo.MedicineForm/
-- dbo.MedicineRoute lookup tables via subquery on Code - this script must run after
-- MedicineLookupSeedData.sql, which adds the additional form/route codes
-- (Suspension, Ointment, Inhaler, Patch, Subcutaneous, Ophthalmic, Otic, Nasal) this
-- data relies on.
--
-- All manufacturer names are fictional placeholders (Generic Health Ltd, PharmaCorp,
-- MedSource Inc, Apex Pharmaceuticals, WellPath Labs, Vantage Biosciences), not real
-- pharmaceutical companies - medicine/generic names, brand names, strengths, and ATC
-- codes reflect real, publicly documented drug information (a WHO Essential Medicines
-- List style selection), which is non-personal reference data, not PII.
--
-- ATCCode is left NULL for the handful of entries with no single well-established WHO
-- ATC code (e.g. Calamine, a multivitamin combination, Olive Oil ear drops) rather than
-- guessing a value that could fail the CK_Medicine_ATCCode format check or simply be
-- wrong - every other row's ATCCode is a real 7-character WHO code for that medicine.

MERGE INTO dbo.Medicine AS Target
USING (VALUES
    -- Analgesics
    ('ANL001', 'Paracetamol',           'Paracetamol',                                 'Panadol',        '500 mg',       'TABLET',     'ORAL', 'Generic Health Ltd',   'N02BE01', 0),
    ('ANL002', 'Paracetamol',           'Paracetamol',                                 CAST(NULL AS NVARCHAR(200)), '1000 mg', 'TABLET', 'ORAL', 'Generic Health Ltd',   'N02BE01', 0),
    ('ANL003', 'Ibuprofen',             'Ibuprofen',                                   'Nurofen',        '200 mg',       'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'M01AE01', 0),
    ('ANL004', 'Ibuprofen',             'Ibuprofen',                                   CAST(NULL AS NVARCHAR(200)), '400 mg', 'TABLET', 'ORAL', 'Apex Pharmaceuticals', 'M01AE01', 0),
    ('ANL005', 'Aspirin',               'Acetylsalicylic Acid',                        'Disprin',        '300 mg',       'TABLET',     'ORAL', 'PharmaCorp',           'N02BA01', 0),
    ('ANL006', 'Diclofenac',            'Diclofenac Sodium',                           'Voltaren',       '50 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'M01AB05', 0),
    ('ANL007', 'Naproxen',              'Naproxen',                                    CAST(NULL AS NVARCHAR(200)), '250 mg', 'TABLET', 'ORAL', 'MedSource Inc',        'M01AE02', 0),
    ('ANL008', 'Tramadol',              'Tramadol Hydrochloride',                      CAST(NULL AS NVARCHAR(200)), '50 mg',  'CAPSULE','ORAL', 'WellPath Labs',        'N02AX02', 1),
    ('ANL009', 'Codeine Phosphate',     'Codeine Phosphate',                           CAST(NULL AS NVARCHAR(200)), '30 mg',  'TABLET', 'ORAL', 'WellPath Labs',        'R05DA04', 1),
    ('ANL010', 'Morphine Sulfate',      'Morphine Sulfate',                            CAST(NULL AS NVARCHAR(200)), '10 mg',  'TABLET', 'ORAL', 'Vantage Biosciences',  'N02AA01', 1),
    ('ANL011', 'Oxycodone',             'Oxycodone Hydrochloride',                     CAST(NULL AS NVARCHAR(200)), '5 mg',   'TABLET', 'ORAL', 'Vantage Biosciences',  'N02AA05', 1),
    ('ANL012', 'Ketorolac',             'Ketorolac Trometamol',                        CAST(NULL AS NVARCHAR(200)), '10 mg',  'TABLET', 'ORAL', 'Apex Pharmaceuticals', 'M01AB15', 0),
    ('ANL013', 'Meloxicam',             'Meloxicam',                                   'Mobic',          '15 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'M01AC06', 0),
    ('ANL014', 'Celecoxib',             'Celecoxib',                                   'Celebrex',       '200 mg',       'CAPSULE',    'ORAL', 'PharmaCorp',           'M01AH01', 0),

    -- Antibiotics
    ('ABX001', 'Amoxicillin',           'Amoxicillin',                                 'Amoxil',         '500 mg',       'CAPSULE',    'ORAL', 'Generic Health Ltd',   'J01CA04', 0),
    ('ABX002', 'Amoxicillin',           'Amoxicillin',                                 'Amoxil',         '250 mg/5mL',   'SUSPENSION', 'ORAL', 'Generic Health Ltd',   'J01CA04', 0),
    ('ABX003', 'Co-amoxiclav',          'Amoxicillin/Clavulanic Acid',                 'Augmentin',      '625 mg',       'TABLET',     'ORAL', 'PharmaCorp',           'J01CR02', 0),
    ('ABX004', 'Doxycycline',           'Doxycycline',                                 CAST(NULL AS NVARCHAR(200)), '100 mg', 'CAPSULE','ORAL', 'MedSource Inc',        'J01AA02', 0),
    ('ABX005', 'Azithromycin',          'Azithromycin',                                'Zithromax',      '250 mg',       'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'J01FA10', 0),
    ('ABX006', 'Ciprofloxacin',         'Ciprofloxacin',                               'Ciproxin',       '500 mg',       'TABLET',     'ORAL', 'Generic Health Ltd',   'J01MA02', 0),
    ('ABX007', 'Cephalexin',            'Cephalexin',                                  'Keflex',         '500 mg',       'CAPSULE',    'ORAL', 'MedSource Inc',        'J01DB01', 0),
    ('ABX008', 'Metronidazole',         'Metronidazole',                               'Flagyl',         '400 mg',       'TABLET',     'ORAL', 'WellPath Labs',        'J01XD01', 0),
    ('ABX009', 'Clarithromycin',        'Clarithromycin',                              'Klacid',         '500 mg',       'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'J01FA09', 0),
    ('ABX010', 'Flucloxacillin',        'Flucloxacillin',                              CAST(NULL AS NVARCHAR(200)), '500 mg', 'CAPSULE','ORAL', 'Generic Health Ltd',   'J01CF05', 0),
    ('ABX011', 'Trimethoprim',          'Trimethoprim',                                CAST(NULL AS NVARCHAR(200)), '200 mg', 'TABLET', 'ORAL', 'PharmaCorp',           'J01EA01', 0),
    ('ABX012', 'Nitrofurantoin',        'Nitrofurantoin',                              'Macrobid',       '100 mg',       'CAPSULE',    'ORAL', 'MedSource Inc',        'J01XE01', 0),
    ('ABX013', 'Erythromycin',         'Erythromycin',                                 CAST(NULL AS NVARCHAR(200)), '250 mg', 'TABLET', 'ORAL', 'Generic Health Ltd',   'J01FA01', 0),
    ('ABX014', 'Vancomycin',            'Vancomycin Hydrochloride',                    CAST(NULL AS NVARCHAR(200)), '500 mg', 'INJECTION', 'IM', 'Vantage Biosciences', 'J01XA01', 0),

    -- Antihypertensives
    ('AHT001', 'Amlodipine',            'Amlodipine Besylate',                         'Norvasc',        '5 mg',         'TABLET',     'ORAL', 'Generic Health Ltd',   'C08CA01', 0),
    ('AHT002', 'Amlodipine',            'Amlodipine Besylate',                         'Norvasc',        '10 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'C08CA01', 0),
    ('AHT003', 'Losartan',              'Losartan Potassium',                          'Cozaar',         '50 mg',        'TABLET',     'ORAL', 'PharmaCorp',           'C09CA01', 0),
    ('AHT004', 'Losartan',              'Losartan Potassium',                          'Cozaar',         '100 mg',       'TABLET',     'ORAL', 'PharmaCorp',           'C09CA01', 0),
    ('AHT005', 'Enalapril',             'Enalapril Maleate',                           CAST(NULL AS NVARCHAR(200)), '10 mg',  'TABLET', 'ORAL', 'MedSource Inc',        'C09AA02', 0),
    ('AHT006', 'Lisinopril',            'Lisinopril',                                  CAST(NULL AS NVARCHAR(200)), '10 mg',  'TABLET', 'ORAL', 'MedSource Inc',        'C09AA03', 0),
    ('AHT007', 'Ramipril',              'Ramipril',                                    'Tritace',        '5 mg',         'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'C09AA05', 0),
    ('AHT008', 'Bisoprolol',            'Bisoprolol Fumarate',                         CAST(NULL AS NVARCHAR(200)), '5 mg',   'TABLET', 'ORAL', 'Generic Health Ltd',   'C07AB07', 0),
    ('AHT009', 'Hydrochlorothiazide',   'Hydrochlorothiazide',                         CAST(NULL AS NVARCHAR(200)), '25 mg',  'TABLET', 'ORAL', 'WellPath Labs',        'C03AA03', 0),
    ('AHT010', 'Valsartan',             'Valsartan',                                   'Diovan',         '80 mg',        'TABLET',     'ORAL', 'PharmaCorp',           'C09CA03', 0),
    ('AHT011', 'Doxazosin',             'Doxazosin Mesylate',                          CAST(NULL AS NVARCHAR(200)), '2 mg',   'TABLET', 'ORAL', 'MedSource Inc',        'C02CA04', 0),
    ('AHT012', 'Nifedipine',            'Nifedipine',                                  'Adalat',         '30 mg',        'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'C08CA05', 0),
    ('AHT013', 'Telmisartan',           'Telmisartan',                                 'Micardis',       '40 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'C09CA07', 0),

    -- Antidiabetics
    ('ADM001', 'Metformin',             'Metformin Hydrochloride',                     'Glucophage',     '500 mg',       'TABLET',     'ORAL', 'Generic Health Ltd',   'A10BA02', 0),
    ('ADM002', 'Metformin',             'Metformin Hydrochloride',                     'Glucophage',     '850 mg',       'TABLET',     'ORAL', 'Generic Health Ltd',   'A10BA02', 0),
    ('ADM003', 'Gliclazide',            'Gliclazide',                                  CAST(NULL AS NVARCHAR(200)), '80 mg',  'TABLET', 'ORAL', 'PharmaCorp',           'A10BB09', 0),
    ('ADM004', 'Glimepiride',           'Glimepiride',                                 CAST(NULL AS NVARCHAR(200)), '2 mg',   'TABLET', 'ORAL', 'MedSource Inc',        'A10BB12', 0),
    ('ADM005', 'Sitagliptin',           'Sitagliptin',                                 'Januvia',        '100 mg',       'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'A10BH01', 0),
    ('ADM006', 'Empagliflozin',         'Empagliflozin',                               'Jardiance',      '10 mg',        'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'A10BK03', 0),
    ('ADM007', 'Insulin Glargine',      'Insulin Glargine',                            'Lantus',         '100 units/mL', 'INJECTION',  'SC',   'Vantage Biosciences',  'A10AE04', 0),
    ('ADM008', 'Insulin Aspart',        'Insulin Aspart',                              'NovoRapid',      '100 units/mL', 'INJECTION',  'SC',   'Vantage Biosciences',  'A10AB05', 0),
    ('ADM009', 'Pioglitazone',          'Pioglitazone',                                CAST(NULL AS NVARCHAR(200)), '15 mg',  'TABLET', 'ORAL', 'Generic Health Ltd',   'A10BG03', 0),
    ('ADM010', 'Acarbose',              'Acarbose',                                    CAST(NULL AS NVARCHAR(200)), '50 mg',  'TABLET', 'ORAL', 'MedSource Inc',        'A10BF01', 0),

    -- Respiratory
    ('RES001', 'Salbutamol',            'Salbutamol Sulfate',                          'Ventolin',       '100 mcg/dose', 'INHALER',    'INHALATION', 'Generic Health Ltd', 'R03AC02', 0),
    ('RES002', 'Salbutamol',            'Salbutamol Sulfate',                          'Ventolin',       '2 mg/5mL',     'SYRUP',      'ORAL', 'Generic Health Ltd',   'R03AC02', 0),
    ('RES003', 'Beclometasone',         'Beclometasone Dipropionate',                  'Becotide',       '100 mcg/dose', 'INHALER',    'INHALATION', 'PharmaCorp',        'R03BA01', 0),
    ('RES004', 'Budesonide',            'Budesonide',                                  'Pulmicort',      '200 mcg/dose', 'INHALER',    'INHALATION', 'Apex Pharmaceuticals', 'R03BA02', 0),
    ('RES005', 'Fluticasone/Salmeterol','Fluticasone Propionate/Salmeterol Xinafoate',  'Seretide',       '250/25 mcg',   'INHALER',    'INHALATION', 'Apex Pharmaceuticals', 'R03AK06', 0),
    ('RES006', 'Montelukast',           'Montelukast Sodium',                          'Singulair',      '10 mg',        'TABLET',     'ORAL', 'MedSource Inc',        'R03DC03', 0),
    ('RES007', 'Ipratropium Bromide',   'Ipratropium Bromide',                         'Atrovent',       '20 mcg/dose',  'INHALER',    'INHALATION', 'Generic Health Ltd', 'R03BB01', 0),
    ('RES008', 'Theophylline',          'Theophylline',                                CAST(NULL AS NVARCHAR(200)), '200 mg', 'TABLET', 'ORAL', 'WellPath Labs',        'R03DA04', 0),
    ('RES009', 'Dextromethorphan',      'Dextromethorphan Hydrobromide',                CAST(NULL AS NVARCHAR(200)), '15 mg/5mL', 'SYRUP', 'ORAL', 'Generic Health Ltd', 'R05DA09', 0),
    ('RES010', 'Guaifenesin',           'Guaifenesin',                                 CAST(NULL AS NVARCHAR(200)), '100 mg/5mL', 'SYRUP', 'ORAL', 'Generic Health Ltd', 'R05CA03', 0),
    ('RES011', 'Codeine Linctus',       'Codeine Phosphate',                           CAST(NULL AS NVARCHAR(200)), '15 mg/5mL', 'SYRUP', 'ORAL', 'WellPath Labs',       'R05DA04', 1),
    ('RES012', 'Formoterol',            'Formoterol Fumarate',                         'Oxis',           '12 mcg/dose',  'INHALER',    'INHALATION', 'PharmaCorp',        'R03AC13', 0),
    ('RES013', 'Tiotropium',            'Tiotropium Bromide',                          'Spiriva',        '18 mcg/dose',  'INHALER',    'INHALATION', 'Apex Pharmaceuticals', 'R03BB04', 0),

    -- Gastrointestinal
    ('GIT001', 'Omeprazole',            'Omeprazole',                                  'Losec',          '20 mg',        'CAPSULE',    'ORAL', 'Generic Health Ltd',   'A02BC01', 0),
    ('GIT002', 'Omeprazole',            'Omeprazole',                                  'Losec',          '40 mg',        'CAPSULE',    'ORAL', 'Generic Health Ltd',   'A02BC01', 0),
    ('GIT003', 'Ranitidine',            'Ranitidine Hydrochloride',                    'Zantac',         '150 mg',       'TABLET',     'ORAL', 'PharmaCorp',           'A02BA02', 0),
    ('GIT004', 'Esomeprazole',          'Esomeprazole Magnesium',                      'Nexium',         '20 mg',        'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'A02BC05', 0),
    ('GIT005', 'Lansoprazole',          'Lansoprazole',                                'Zoton',          '30 mg',        'CAPSULE',    'ORAL', 'MedSource Inc',        'A02BC03', 0),
    ('GIT006', 'Domperidone',           'Domperidone',                                 'Motilium',       '10 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'A03FA03', 0),
    ('GIT007', 'Metoclopramide',        'Metoclopramide Hydrochloride',                'Maxolon',        '10 mg',        'TABLET',     'ORAL', 'WellPath Labs',        'A03FA01', 0),
    ('GIT008', 'Loperamide',            'Loperamide Hydrochloride',                    'Imodium',        '2 mg',         'CAPSULE',    'ORAL', 'Generic Health Ltd',   'A07DA03', 0),
    ('GIT009', 'Lactulose',             'Lactulose',                                   'Duphalac',       '3.35 g/5mL',   'SYRUP',      'ORAL', 'PharmaCorp',           'A06AD11', 0),
    ('GIT010', 'Mebeverine',            'Mebeverine Hydrochloride',                    'Colofac',        '135 mg',       'TABLET',     'ORAL', 'MedSource Inc',        'A03AA04', 0),
    ('GIT011', 'Ondansetron',           'Ondansetron Hydrochloride',                   'Zofran',         '4 mg',         'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'A04AA01', 0),
    ('GIT012', 'Simethicone',           'Simethicone',                                 'Mylicon',        '125 mg',       'TABLET',     'ORAL', 'Generic Health Ltd',   'A03AX13', 0),
    ('GIT013', 'Bisacodyl',             'Bisacodyl',                                   'Dulcolax',       '5 mg',         'TABLET',     'ORAL', 'PharmaCorp',           'A06AB02', 0),

    -- Dermatology
    ('DRM001', 'Hydrocortisone',        'Hydrocortisone',                              CAST(NULL AS NVARCHAR(200)), '1%',     'CREAM',  'TOPICAL', 'Generic Health Ltd', 'D07AA02', 0),
    ('DRM002', 'Betamethasone',         'Betamethasone Valerate',                      'Betnovate',      '0.1%',         'CREAM',      'TOPICAL', 'PharmaCorp',        'D07AC01', 0),
    ('DRM003', 'Clotrimazole',          'Clotrimazole',                                'Canesten',       '1%',           'CREAM',      'TOPICAL', 'MedSource Inc',     'D01AC01', 0),
    ('DRM004', 'Mupirocin',             'Mupirocin',                                   'Bactroban',      '2%',           'OINTMENT',   'TOPICAL', 'Apex Pharmaceuticals', 'D06AX09', 0),
    ('DRM005', 'Benzoyl Peroxide',      'Benzoyl Peroxide',                            'Panoxyl',        '5%',           'CREAM',      'TOPICAL', 'Generic Health Ltd', 'D10AE01', 0),
    ('DRM006', 'Fusidic Acid',          'Fusidic Acid',                                'Fucidin',        '2%',           'CREAM',      'TOPICAL', 'PharmaCorp',        'D06AX01', 0),
    ('DRM007', 'Calamine',              'Calamine',                                    CAST(NULL AS NVARCHAR(200)), '8%',     'CREAM',  'TOPICAL', 'Generic Health Ltd', CAST(NULL AS NVARCHAR(20)), 0),
    ('DRM008', 'Permethrin',            'Permethrin',                                  CAST(NULL AS NVARCHAR(200)), '5%',     'CREAM',  'TOPICAL', 'MedSource Inc',      'P03AC04', 0),
    ('DRM009', 'Clobetasol',            'Clobetasol Propionate',                       'Dermovate',      '0.05%',        'OINTMENT',   'TOPICAL', 'Apex Pharmaceuticals', 'D07AD01', 0),
    ('DRM010', 'Silver Sulfadiazine',   'Silver Sulfadiazine',                         CAST(NULL AS NVARCHAR(200)), '1%',     'CREAM',  'TOPICAL', 'Generic Health Ltd', 'D06BA01', 0),

    -- Cardiology
    ('CVS001', 'Atorvastatin',          'Atorvastatin Calcium',                        'Lipitor',        '20 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'C10AA05', 0),
    ('CVS002', 'Atorvastatin',          'Atorvastatin Calcium',                        'Lipitor',        '40 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'C10AA05', 0),
    ('CVS003', 'Simvastatin',           'Simvastatin',                                 'Zocor',          '20 mg',        'TABLET',     'ORAL', 'PharmaCorp',           'C10AA01', 0),
    ('CVS004', 'Rosuvastatin',          'Rosuvastatin Calcium',                        'Crestor',        '10 mg',        'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'C10AA07', 0),
    ('CVS005', 'Aspirin (Low Dose)',    'Acetylsalicylic Acid',                        'Cartia',         '100 mg',       'TABLET',     'ORAL', 'PharmaCorp',           'B01AC06', 0),
    ('CVS006', 'Clopidogrel',           'Clopidogrel Bisulfate',                       'Plavix',         '75 mg',        'TABLET',     'ORAL', 'MedSource Inc',        'B01AC04', 0),
    ('CVS007', 'Warfarin',              'Warfarin Sodium',                             'Coumadin',       '5 mg',         'TABLET',     'ORAL', 'Generic Health Ltd',   'B01AA03', 0),
    ('CVS008', 'Rivaroxaban',           'Rivaroxaban',                                 'Xarelto',        '20 mg',        'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'B01AF01', 0),
    ('CVS009', 'Glyceryl Trinitrate',   'Glyceryl Trinitrate',                         'Nitro-Dur',      '5 mg',         'PATCH',      'TOPICAL', 'WellPath Labs',      'C01DA02', 0),
    ('CVS010', 'Digoxin',               'Digoxin',                                     'Lanoxin',        '125 mcg',      'TABLET',     'ORAL', 'Generic Health Ltd',   'C01AA05', 0),
    ('CVS011', 'Spironolactone',        'Spironolactone',                              'Aldactone',      '25 mg',        'TABLET',     'ORAL', 'PharmaCorp',           'C03DA01', 0),
    ('CVS012', 'Furosemide',            'Furosemide',                                  'Lasix',          '40 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'C03CA01', 0),

    -- Psychiatry
    ('PSY001', 'Sertraline',            'Sertraline Hydrochloride',                    'Zoloft',         '50 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'N06AB06', 0),
    ('PSY002', 'Fluoxetine',            'Fluoxetine Hydrochloride',                    'Prozac',         '20 mg',        'CAPSULE',    'ORAL', 'PharmaCorp',           'N06AB03', 0),
    ('PSY003', 'Citalopram',            'Citalopram Hydrobromide',                     'Cipramil',       '20 mg',        'TABLET',     'ORAL', 'MedSource Inc',        'N06AB04', 0),
    ('PSY004', 'Escitalopram',          'Escitalopram Oxalate',                        'Lexapro',        '10 mg',        'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'N06AB10', 0),
    ('PSY005', 'Diazepam',              'Diazepam',                                    'Valium',         '5 mg',         'TABLET',     'ORAL', 'WellPath Labs',        'N05BA01', 1),
    ('PSY006', 'Lorazepam',             'Lorazepam',                                   'Ativan',         '1 mg',         'TABLET',     'ORAL', 'WellPath Labs',        'N05BA06', 1),
    ('PSY007', 'Alprazolam',            'Alprazolam',                                  'Xanax',          '0.25 mg',      'TABLET',     'ORAL', 'WellPath Labs',        'N05BA12', 1),
    ('PSY008', 'Zopiclone',             'Zopiclone',                                   'Imovane',        '7.5 mg',       'TABLET',     'ORAL', 'WellPath Labs',        'N05CF01', 1),
    ('PSY009', 'Olanzapine',            'Olanzapine',                                  'Zyprexa',        '10 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'N05AH03', 0),
    ('PSY010', 'Quetiapine',            'Quetiapine Fumarate',                         'Seroquel',       '25 mg',        'TABLET',     'ORAL', 'PharmaCorp',           'N05AH04', 0),
    ('PSY011', 'Risperidone',           'Risperidone',                                 'Risperdal',      '2 mg',         'TABLET',     'ORAL', 'MedSource Inc',        'N05AX08', 0),
    ('PSY012', 'Methylphenidate',       'Methylphenidate Hydrochloride',                'Ritalin',        '10 mg',        'TABLET',     'ORAL', 'Vantage Biosciences', 'N06BA04', 1),

    -- Endocrinology
    ('END001', 'Levothyroxine',         'Levothyroxine Sodium',                        'Eltroxin',       '50 mcg',       'TABLET',     'ORAL', 'Generic Health Ltd',   'H03AA01', 0),
    ('END002', 'Levothyroxine',         'Levothyroxine Sodium',                        'Eltroxin',       '100 mcg',      'TABLET',     'ORAL', 'Generic Health Ltd',   'H03AA01', 0),
    ('END003', 'Carbimazole',           'Carbimazole',                                 'Neo-Mercazole',  '5 mg',         'TABLET',     'ORAL', 'PharmaCorp',           'H03BB01', 0),
    ('END004', 'Prednisolone',          'Prednisolone',                                CAST(NULL AS NVARCHAR(200)), '5 mg',   'TABLET', 'ORAL', 'Generic Health Ltd',   'H02AB06', 0),
    ('END005', 'Prednisolone',          'Prednisolone',                                CAST(NULL AS NVARCHAR(200)), '25 mg',  'TABLET', 'ORAL', 'Generic Health Ltd',   'H02AB06', 0),
    ('END006', 'Hydrocortisone',        'Hydrocortisone',                              'Cortef',         '10 mg',        'TABLET',     'ORAL', 'MedSource Inc',        'H02AB09', 0),
    ('END007', 'Fludrocortisone',       'Fludrocortisone Acetate',                     'Florinef',       '100 mcg',      'TABLET',     'ORAL', 'Apex Pharmaceuticals', 'H02AA02', 0),
    ('END008', 'Dexamethasone',         'Dexamethasone',                               'Decadron',       '2 mg',         'TABLET',     'ORAL', 'Generic Health Ltd',   'H02AB02', 0),
    ('END009', 'Calcitriol',            'Calcitriol',                                  'Rocaltrol',      '0.25 mcg',     'CAPSULE',    'ORAL', 'PharmaCorp',           'A11CC04', 0),

    -- Allergy
    ('ALG001', 'Cetirizine',            'Cetirizine Hydrochloride',                    'Zyrtec',         '10 mg',        'TABLET',     'ORAL', 'Generic Health Ltd',   'R06AE07', 0),
    ('ALG002', 'Loratadine',            'Loratadine',                                  'Claratyne',      '10 mg',        'TABLET',     'ORAL', 'PharmaCorp',           'R06AX13', 0),
    ('ALG003', 'Fexofenadine',          'Fexofenadine Hydrochloride',                  'Telfast',        '180 mg',       'TABLET',     'ORAL', 'MedSource Inc',        'R06AX26', 0),
    ('ALG004', 'Chlorphenamine',        'Chlorphenamine Maleate',                      'Piriton',        '4 mg',         'TABLET',     'ORAL', 'Generic Health Ltd',   'R06AB04', 0),
    ('ALG005', 'Promethazine',          'Promethazine Hydrochloride',                  'Phenergan',      '25 mg',        'TABLET',     'ORAL', 'WellPath Labs',        'R06AD02', 0),
    ('ALG006', 'Desloratadine',         'Desloratadine',                               'Aerius',         '5 mg',         'TABLET',     'ORAL', 'PharmaCorp',           'R06AX27', 0),
    ('ALG007', 'Adrenaline',            'Adrenaline (Epinephrine)',                    'EpiPen',         '0.3 mg',       'INJECTION',  'IM',   'Vantage Biosciences',  'C01CA24', 0),
    ('ALG008', 'Levocetirizine',        'Levocetirizine Dihydrochloride',              'Xyzal',          '5 mg',         'TABLET',     'ORAL', 'Generic Health Ltd',   'R06AE09', 0),

    -- Vitamins
    ('VIT001', 'Cholecalciferol',       'Vitamin D3',                                  'Ostelin',        '1000 IU',      'TABLET',     'ORAL', 'Generic Health Ltd',   'A11CC05', 0),
    ('VIT002', 'Cyanocobalamin',        'Vitamin B12',                                 'Neo-B12',        '1000 mcg',     'INJECTION',  'IM',   'MedSource Inc',        'B03BA01', 0),
    ('VIT003', 'Folic Acid',            'Folic Acid',                                  CAST(NULL AS NVARCHAR(200)), '5 mg',   'TABLET', 'ORAL', 'Generic Health Ltd',   'B03BB01', 0),
    ('VIT004', 'Ferrous Sulfate',       'Ferrous Sulfate',                             'Ferro-Gradumet', '200 mg',       'TABLET',     'ORAL', 'PharmaCorp',           'B03AA07', 0),
    ('VIT005', 'Multivitamin',          'Multivitamin',                                'Centrum',        'Standard Dose','TABLET',     'ORAL', 'Apex Pharmaceuticals', CAST(NULL AS NVARCHAR(20)), 0),
    ('VIT006', 'Calcium Carbonate',     'Calcium Carbonate',                           'Caltrate',       '500 mg',       'TABLET',     'ORAL', 'Generic Health Ltd',   'A12AA04', 0),
    ('VIT007', 'Thiamine',              'Vitamin B1',                                  CAST(NULL AS NVARCHAR(200)), '100 mg', 'TABLET', 'ORAL', 'MedSource Inc',        'A11DA01', 0),
    ('VIT008', 'Ascorbic Acid',         'Vitamin C',                                   CAST(NULL AS NVARCHAR(200)), '500 mg', 'TABLET', 'ORAL', 'Generic Health Ltd',   'A11GA01', 0),
    ('VIT009', 'Zinc Sulfate',          'Zinc Sulfate',                                CAST(NULL AS NVARCHAR(200)), '220 mg', 'TABLET', 'ORAL', 'PharmaCorp',           'A12CB01', 0),

    -- Ophthalmic
    ('OPH001', 'Chloramphenicol',       'Chloramphenicol',                             'Chlorsig',       '0.5%',         'DROPS',      'OPHTHALMIC', 'Generic Health Ltd', 'S01AA01', 0),
    ('OPH002', 'Timolol',               'Timolol Maleate',                             'Timoptol',       '0.5%',         'DROPS',      'OPHTHALMIC', 'PharmaCorp',        'S01ED01', 0),
    ('OPH003', 'Latanoprost',           'Latanoprost',                                 'Xalatan',        '0.005%',       'DROPS',      'OPHTHALMIC', 'Apex Pharmaceuticals', 'S01EE01', 0),
    ('OPH004', 'Sodium Cromoglicate',   'Sodium Cromoglicate',                         'Opticrom',       '2%',           'DROPS',      'OPHTHALMIC', 'MedSource Inc',     'S01GX01', 0),
    ('OPH005', 'Hypromellose',          'Hypromellose',                                'Artificial Tears','0.3%',        'DROPS',      'OPHTHALMIC', 'Generic Health Ltd', 'S01XA20', 0),
    ('OPH006', 'Dexamethasone',         'Dexamethasone',                               'Maxidex',        '0.1%',         'DROPS',      'OPHTHALMIC', 'PharmaCorp',        'S01BA01', 0),
    ('OPH007', 'Ciprofloxacin',         'Ciprofloxacin',                               'Ciloxan',        '0.3%',         'DROPS',      'OPHTHALMIC', 'Generic Health Ltd', 'S01AE03', 0),
    ('OPH008', 'Brimonidine',           'Brimonidine Tartrate',                        'Alphagan',       '0.2%',         'DROPS',      'OPHTHALMIC', 'Apex Pharmaceuticals', 'S01EA05', 0),

    -- ENT
    ('ENT001', 'Xylometazoline',        'Xylometazoline Hydrochloride',                'Otrivin',        '0.1%',         'DROPS',      'NASAL', 'Generic Health Ltd',   'R01AA07', 0),
    ('ENT002', 'Fluticasone',           'Fluticasone Propionate',                      'Flixonase',      '50 mcg',       'DROPS',      'NASAL', 'Apex Pharmaceuticals', 'R01AD08', 0),
    ('ENT003', 'Sodium Chloride',       'Sodium Chloride',                             CAST(NULL AS NVARCHAR(200)), '0.9%',   'DROPS',  'NASAL', 'Generic Health Ltd',   'R01AX10', 0),
    ('ENT004', 'Olive Oil',             'Olive Oil',                                   CAST(NULL AS NVARCHAR(200)), '100%',   'DROPS',  'OTIC',  'Generic Health Ltd',   CAST(NULL AS NVARCHAR(20)), 0),
    ('ENT005', 'Ciprofloxacin (Ear)',   'Ciprofloxacin',                               'Ciproxin HC',    '0.3%',         'DROPS',      'OTIC',  'Generic Health Ltd',   'S02AA15', 0),
    ('ENT006', 'Betahistine',           'Betahistine Dihydrochloride',                 'Serc',           '16 mg',        'TABLET',     'ORAL',  'PharmaCorp',           'N07CA01', 0),
    ('ENT007', 'Pseudoephedrine',       'Pseudoephedrine Hydrochloride',               'Sudafed',        '60 mg',        'TABLET',     'ORAL',  'MedSource Inc',        'R01BA02', 0),
    ('ENT008', 'Cinnarizine',           'Cinnarizine',                                 'Stugeron',       '15 mg',        'TABLET',     'ORAL',  'Apex Pharmaceuticals', 'N07CA02', 0)
) AS Source (MedicineCode, MedicineName, GenericName, BrandName, Strength, DosageFormCode, RouteCode, Manufacturer, ATCCode, IsControlledDrug)
ON Target.MedicineCode = Source.MedicineCode
WHEN NOT MATCHED BY TARGET THEN
    INSERT (
        MedicineCode, MedicineName, GenericName, BrandName, Strength,
        MedicineFormId, MedicineRouteId, Manufacturer, ATCCode, IsControlledDrug, CreatedBy
    )
    VALUES (
        Source.MedicineCode,
        Source.MedicineName,
        Source.GenericName,
        Source.BrandName,
        Source.Strength,
        (SELECT MedicineFormId FROM dbo.MedicineForm WHERE Code = Source.DosageFormCode),
        (SELECT MedicineRouteId FROM dbo.MedicineRoute WHERE Code = Source.RouteCode),
        Source.Manufacturer,
        Source.ATCCode,
        Source.IsControlledDrug,
        'System'
    );
GO
