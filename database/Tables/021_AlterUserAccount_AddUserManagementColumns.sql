-- User Management: extends the existing dbo.UserAccount table (built for Authentication)
-- rather than introducing a new User/Role/UserRole table, per the approved database
-- spec's core decision. Every step below is guarded so this script is safe to re-run.

-- FirstName / LastName: added nullable first, backfilled from the existing FullName
-- column (best-effort split on the first space), then locked to NOT NULL - this
-- preserves the existing seeded admin row instead of dropping/recreating it.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'FirstName')
BEGIN
    ALTER TABLE dbo.UserAccount ADD FirstName NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'LastName')
BEGIN
    ALTER TABLE dbo.UserAccount ADD LastName NVARCHAR(100) NULL;
END
GO

UPDATE dbo.UserAccount
SET
    FirstName = CASE
        WHEN CHARINDEX(' ', FullName) > 0 THEN LEFT(FullName, CHARINDEX(' ', FullName) - 1)
        ELSE FullName
    END,
    LastName = CASE
        WHEN CHARINDEX(' ', FullName) > 0 THEN LTRIM(SUBSTRING(FullName, CHARINDEX(' ', FullName) + 1, LEN(FullName)))
        ELSE ''
    END
WHERE FirstName IS NULL OR LastName IS NULL;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'FirstName' AND is_nullable = 1)
BEGIN
    ALTER TABLE dbo.UserAccount ALTER COLUMN FirstName NVARCHAR(100) NOT NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'LastName' AND is_nullable = 1)
BEGIN
    ALTER TABLE dbo.UserAccount ALTER COLUMN LastName NVARCHAR(100) NOT NULL;
END
GO

-- Email: added nullable first, backfilled with a deterministic, unique placeholder for
-- any existing row (there is no prior email data to preserve), then locked to NOT NULL
-- and given its UNIQUE constraint. Placeholder values should be corrected by an
-- Administrator after this migration runs.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'Email')
BEGIN
    ALTER TABLE dbo.UserAccount ADD Email NVARCHAR(256) NULL;
END
GO

UPDATE dbo.UserAccount
SET Email = LOWER(Username) + N'@placeholder.local'
WHERE Email IS NULL;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'Email' AND is_nullable = 1)
BEGIN
    ALTER TABLE dbo.UserAccount ALTER COLUMN Email NVARCHAR(256) NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_UserAccount_Email' AND parent_object_id = OBJECT_ID('dbo.UserAccount'))
BEGIN
    ALTER TABLE dbo.UserAccount ADD CONSTRAINT UQ_UserAccount_Email UNIQUE (Email);
END
GO

-- PhoneNumber: optional, no existing data to backfill.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'PhoneNumber')
BEGIN
    ALTER TABLE dbo.UserAccount ADD PhoneNumber NVARCHAR(20) NULL;
END
GO

-- LastLoginDate: optional, populated later by Authentication's login flow (not this
-- migration) - see database-spec.md section 10, item 1.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'LastLoginDate')
BEGIN
    ALTER TABLE dbo.UserAccount ADD LastLoginDate DATETIME2 NULL;
END
GO

-- MustChangePassword: NOT NULL with a DEFAULT, so SQL Server backfills existing rows
-- to 0 automatically within this single statement - no separate backfill step needed.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'MustChangePassword')
BEGIN
    ALTER TABLE dbo.UserAccount ADD MustChangePassword BIT NOT NULL CONSTRAINT DF_UserAccount_MustChangePassword DEFAULT (0);
END
GO

-- RowVersion: system-maintained, SQL Server populates it for existing rows automatically
-- as soon as the column is added.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserAccount') AND name = 'RowVersion')
BEGIN
    ALTER TABLE dbo.UserAccount ADD RowVersion ROWVERSION;
END
GO

-- Indexes recommended by the approved database spec (section 6).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserAccount_IsActive' AND object_id = OBJECT_ID('dbo.UserAccount'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_UserAccount_IsActive ON dbo.UserAccount (IsActive);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserAccount_LastName_FirstName' AND object_id = OBJECT_ID('dbo.UserAccount'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_UserAccount_LastName_FirstName ON dbo.UserAccount (LastName, FirstName);
END
GO
