-- Gender
MERGE INTO dbo.Gender AS Target
USING (VALUES
    ('MALE',   'Male',   1),
    ('FEMALE', 'Female', 2),
    ('OTHER',  'Other',  3)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- PrescriptionStatus
MERGE INTO dbo.PrescriptionStatus AS Target
USING (VALUES
    ('DRAFT',      'Draft',      1),
    ('PENDING',    'Pending',    2),
    ('PROCESSING', 'Processing', 3),
    ('SENT',       'Sent',       4),
    ('DISPENSED',  'Dispensed',  5),
    ('CANCELLED',  'Cancelled',  6),
    ('FAILED',     'Failed',     7),
    ('EXPIRED',    'Expired',    8)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- MedicineForm
MERGE INTO dbo.MedicineForm AS Target
USING (VALUES
    ('TABLET',    'Tablet',    1),
    ('CAPSULE',   'Capsule',   2),
    ('SYRUP',     'Syrup',     3),
    ('INJECTION', 'Injection', 4),
    ('CREAM',     'Cream',     5),
    ('DROPS',     'Drops',     6)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- MedicineRoute
MERGE INTO dbo.MedicineRoute AS Target
USING (VALUES
    ('ORAL',        'Oral',               1),
    ('IV',          'Intravenous (IV)',   2),
    ('IM',          'Intramuscular (IM)', 3),
    ('TOPICAL',     'Topical',            4),
    ('INHALATION',  'Inhalation',         5)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- DoseUnit
MERGE INTO dbo.DoseUnit AS Target
USING (VALUES
    ('MG',      'mg',      1),
    ('G',       'g',       2),
    ('ML',      'ml',      3),
    ('TABLET',  'Tablet',  4),
    ('CAPSULE', 'Capsule', 5),
    ('PUFF',    'Puff',    6)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- Frequency
MERGE INTO dbo.Frequency AS Target
USING (VALUES
    ('ONCE_DAILY',        'Once Daily',         1),
    ('TWICE_DAILY',       'Twice Daily',        2),
    ('THREE_TIMES_DAILY', 'Three Times Daily',  3),
    ('FOUR_TIMES_DAILY',  'Four Times Daily',   4),
    ('EVERY_4_HOURS',     'Every 4 Hours',      5),
    ('EVERY_6_HOURS',     'Every 6 Hours',      6),
    ('EVERY_8_HOURS',     'Every 8 Hours',      7),
    ('EVERY_12_HOURS',    'Every 12 Hours',     8),
    ('PRN',               'As Required (PRN)',  9)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- DurationUnit
MERGE INTO dbo.DurationUnit AS Target
USING (VALUES
    ('DAYS',   'Days',   1),
    ('WEEKS',  'Weeks',  2),
    ('MONTHS', 'Months', 3)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- ProfileType
MERGE INTO dbo.ProfileType AS Target
USING (VALUES
    ('DOCTOR',        'Doctor',        1),
    ('NURSE',         'Nurse',         2),
    ('PHARMACIST',    'Pharmacist',    3),
    ('ADMINISTRATOR', 'Administrator', 4)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO
