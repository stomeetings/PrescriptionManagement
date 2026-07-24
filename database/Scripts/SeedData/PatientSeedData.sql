-- Patient
-- Seeds 16 sample patients for local development and testing (business spec section 4,
-- database-spec.md sections 3.1/3.3). NHINumber is used as the natural key for the MERGE
-- match, since every seeded patient is given a unique sample NHI number - this keeps the
-- script idempotent (safe to re-run) without depending on identity values.
--
-- PatientNumber is generated via NEXT VALUE FOR dbo.Patient_PatientNumberSequence, the
-- same sequence Step 4's usp_Patient_Create will use, formatted 'PT-000001' per the
-- approved database spec (section 3.3). Because NEXT VALUE FOR only appears inside the
-- INSERT action, it is only evaluated for rows that are actually new on a given run - on
-- a repeat run every row already matches by NHINumber and no INSERT (and therefore no
-- sequence advance) happens, so re-running this script never burns sequence values or
-- creates gaps.
--
-- All sample data (names, addresses, NHI numbers, emails) is entirely fictional - not
-- drawn from any real person. Email domains use example.com/example.co.nz, the domains
-- reserved by IANA for documentation and testing.
--
-- GenderId is resolved from the existing dbo.Gender lookup (MALE/FEMALE/OTHER, seeded by
-- LookupSeedData.sql) - no new gender values are introduced.
--
-- NZMCNumber is deliberately left unpopulated for every seeded patient: the approved
-- database spec flags this column as a likely business-spec error (an NZ Medical Council
-- number belongs to a practitioner, not a patient - see database-spec.md section 10 item
-- 1), so no fake practitioner-style data is invented for it here.

MERGE INTO dbo.Patient AS Target
USING (VALUES
    ('ABC1234', 'Grace',     'Wilson',     CAST(NULL AS NVARCHAR(100)), '1985-03-12', 'FEMALE', '021 234 5678', 'grace.wilson@example.com',     '12 Queen Street',      'Auckland',          'Auckland',            '1010', 'New Zealand', 1, '2025-08-04T09:15:00', CAST(NULL AS DATETIME2)),
    ('DEF2345', 'James',     'Anderson',   'Jim',                        '1978-11-02', 'MALE',   '022 345 6789', 'james.anderson@example.com',   '45 Lambton Quay',      'Wellington',        'Wellington',          '6011', 'New Zealand', 1, '2025-08-10T10:30:00', '2025-11-02T14:00:00'),
    ('GHI3456', 'Olivia',    'Thompson',   CAST(NULL AS NVARCHAR(100)), '1992-06-23', 'FEMALE', '027 456 7890', 'olivia.thompson@example.com',  '78 Riccarton Road',    'Christchurch',      'Canterbury',          '8011', 'New Zealand', 1, '2025-08-15T08:45:00', CAST(NULL AS DATETIME2)),
    ('JKL4567', 'Liam',      'Roberts',    CAST(NULL AS NVARCHAR(100)), '1965-01-30', 'MALE',   '021 567 8901', 'liam.roberts@example.com',     '23 Victoria Street',   'Hamilton',          'Waikato',             '3204', 'New Zealand', 1, '2025-09-01T11:00:00', '2026-01-15T09:20:00'),
    ('MNO5678', 'Sophie',    'Mitchell',   CAST(NULL AS NVARCHAR(100)), '1999-09-17', 'FEMALE', '022 678 9012', 'sophie.mitchell@example.com',  '56 George Street',     'Dunedin',           'Otago',               '9016', 'New Zealand', 1, '2025-09-10T13:30:00', CAST(NULL AS DATETIME2)),
    ('PQR6789', 'Noah',      'Campbell',   CAST(NULL AS NVARCHAR(100)), '1988-04-05', 'MALE',   '027 789 0123', 'noah.campbell@example.com',    '9 Cameron Road',       'Tauranga',          'Bay of Plenty',       '3110', 'New Zealand', 1, '2025-09-18T07:50:00', '2025-12-05T16:40:00'),
    ('STU7890', 'Isla',      'Stewart',    CAST(NULL AS NVARCHAR(100)), '2003-12-25', 'FEMALE', '021 890 1234', 'isla.stewart@example.com',     '34 Emerson Street',    'Napier',            'Hawke''s Bay',        '4110', 'New Zealand', 1, '2025-10-02T15:10:00', CAST(NULL AS DATETIME2)),
    ('VWX8901', 'Jack',      'Robertson',  CAST(NULL AS NVARCHAR(100)), '1971-07-19', 'MALE',   '022 901 2345', 'jack.robertson@example.com',   '61 Broadway',          'Palmerston North',  'Manawatu-Whanganui',  '4410', 'New Zealand', 1, '2025-10-11T12:20:00', '2026-02-20T10:05:00'),
    ('YZA9012', 'Ava',       'Henderson',  CAST(NULL AS NVARCHAR(100)), '1995-02-14', 'FEMALE', '027 012 3456', 'ava.henderson@example.com',    '17 Fenton Street',     'Rotorua',           'Bay of Plenty',       '3010', 'New Zealand', 1, '2025-10-20T09:40:00', CAST(NULL AS DATETIME2)),
    ('BCD0123', 'Oliver',    'Fraser',     CAST(NULL AS NVARCHAR(100)), '1980-05-08', 'MALE',   '021 123 4567', 'oliver.fraser@example.com',    '88 Devon Street',      'New Plymouth',      'Taranaki',            '4310', 'New Zealand', 1, '2025-11-01T14:15:00', '2026-03-01T11:30:00'),
    ('EFG1235', 'Mia',       'Sutherland', CAST(NULL AS NVARCHAR(100)), '1990-10-21', 'FEMALE', '022 234 5671', 'mia.sutherland@example.com',   '5 Trafalgar Street',   'Nelson',            'Nelson',              '7010', 'New Zealand', 1, '2025-11-14T10:00:00', CAST(NULL AS DATETIME2)),
    ('HIJ2346', 'Lucas',     'Cameron',    CAST(NULL AS NVARCHAR(100)), '1968-08-27', 'MALE',   '027 345 6782', 'lucas.cameron@example.com',    '29 Dee Street',        'Invercargill',      'Southland',           '9810', 'New Zealand', 1, '2025-11-25T16:50:00', '2026-04-10T13:15:00'),
    ('KLM3457', 'Charlotte', 'Duncan',     'Charlie',                    '1997-03-03', 'OTHER',  '021 456 7893', 'charlotte.duncan@example.com', '41 Bank Street',       'Whangarei',         'Northland',           '0110', 'New Zealand', 1, '2025-12-02T09:25:00', CAST(NULL AS DATETIME2)),
    ('NOP4568', 'Ethan',     'Ferguson',   CAST(NULL AS NVARCHAR(100)), '1983-11-11', 'MALE',   '022 567 8904', 'ethan.ferguson@example.com',   '13 Gladstone Road',    'Gisborne',          'Gisborne',            '4010', 'New Zealand', 1, '2025-12-15T11:45:00', '2026-05-05T08:55:00'),
    ('QRS5679', 'Amelia',    'Grant',      CAST(NULL AS NVARCHAR(100)), '1975-06-30', 'FEMALE', '027 678 9015', 'amelia.grant@example.com',     '3 Shotover Street',    'Queenstown',        'Otago',               '9300', 'New Zealand', 0, '2025-08-20T10:10:00', '2026-06-01T09:00:00'),
    ('TUV6780', 'Benjamin',  'Hunter',     CAST(NULL AS NVARCHAR(100)), '1960-01-15', 'MALE',   '021 789 0126', 'benjamin.hunter@example.com',  '77 Guyton Street',     'Whanganui',         'Manawatu-Whanganui',  '4500', 'New Zealand', 0, '2025-09-05T13:00:00', '2026-06-10T15:30:00')
) AS Source (NHINumber, FirstName, LastName, PreferredName, DateOfBirth, GenderCode, MobileNumber, Email, AddressLine1, City, Region, PostalCode, Country, IsActive, CreatedDate, UpdatedDate)
ON Target.NHINumber = Source.NHINumber
WHEN NOT MATCHED BY TARGET THEN
    INSERT (
        PatientNumber, FirstName, LastName, PreferredName, DateOfBirth, GenderId,
        MobileNumber, Email, AddressLine1, City, Region, PostalCode, Country,
        NHINumber, IsActive, CreatedDate, CreatedBy, UpdatedDate, UpdatedBy
    )
    VALUES (
        'PT-' + RIGHT('000000' + CAST(NEXT VALUE FOR dbo.Patient_PatientNumberSequence AS VARCHAR(6)), 6),
        Source.FirstName,
        Source.LastName,
        Source.PreferredName,
        Source.DateOfBirth,
        (SELECT GenderId FROM dbo.Gender WHERE Code = Source.GenderCode),
        Source.MobileNumber,
        Source.Email,
        Source.AddressLine1,
        Source.City,
        Source.Region,
        Source.PostalCode,
        Source.Country,
        Source.NHINumber,
        Source.IsActive,
        Source.CreatedDate,
        'System',
        Source.UpdatedDate,
        CASE WHEN Source.UpdatedDate IS NULL THEN NULL ELSE 'System' END
    );
GO
