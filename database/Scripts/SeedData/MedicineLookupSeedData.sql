-- Medicine Management: appends the additional Dosage Form/Route/Dose Unit/Frequency
-- values this module's medicine seed data needs, on top of the base set already seeded
-- by LookupSeedData.sql (Lookup Management). Purely additive - MERGE ON Code match
-- means re-running this script never duplicates a value, and the original rows in each
-- table are left untouched except for one explicit, clinically-motivated reordering
-- noted below. Duration Unit needs no additions - Days/Weeks/Months (this task's full
-- requested list) are already seeded and are not repeated here.

-- MedicineForm: existing DisplayOrder 1-6 (Tablet, Capsule, Syrup, Injection, Cream,
-- Drops) untouched; appending 7-10.
MERGE INTO dbo.MedicineForm AS Target
USING (VALUES
    ('SUSPENSION', 'Suspension', 7),
    ('OINTMENT',   'Ointment',   8),
    ('INHALER',    'Inhaler',    9),
    ('PATCH',      'Patch',      10)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- MedicineRoute: existing DisplayOrder 1-5 (Oral, IV, IM, Topical, Inhalation)
-- untouched; appending 6-11.
MERGE INTO dbo.MedicineRoute AS Target
USING (VALUES
    ('SC',         'Subcutaneous (SC)', 6),
    ('OPHTHALMIC', 'Ophthalmic',        7),
    ('OTIC',       'Otic',              8),
    ('NASAL',      'Nasal',             9),
    ('RECTAL',     'Rectal',            10),
    ('VAGINAL',    'Vaginal',           11)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- DoseUnit: existing DisplayOrder 1-6 (mg, g, ml, Tablet, Capsule, Puff) untouched;
-- appending 7-9.
MERGE INTO dbo.DoseUnit AS Target
USING (VALUES
    ('MCG',   'mcg',   7),
    ('UNITS', 'Units', 8),
    ('DROP',  'Drop',  9)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- Frequency: existing DisplayOrder 1-9 (Once Daily .. PRN) mostly untouched. Weekly/
-- Monthly are inserted at 10-11, and PRN (originally 9, "as needed" - clinically a
-- catch-all that reads best last in a dropdown) is renumbered to 12 so it continues to
-- sort after every regular-interval option, including the two just added. This is the
-- one explicit, intentional exception to "existing rows are left untouched" in this
-- script - a DisplayOrder correction only (Code/DisplayText unchanged), and it is
-- idempotent: a second run finds PRN already at 12 and updates nothing further.
MERGE INTO dbo.Frequency AS Target
USING (VALUES
    ('WEEKLY',  'Weekly',            10),
    ('MONTHLY', 'Monthly',           11),
    ('PRN',     'As Required (PRN)', 12)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System')
WHEN MATCHED AND Target.Code = 'PRN' AND Target.DisplayOrder <> Source.DisplayOrder THEN
    UPDATE SET DisplayOrder = Source.DisplayOrder, UpdatedBy = 'System', UpdatedDate = SYSUTCDATETIME();
GO
