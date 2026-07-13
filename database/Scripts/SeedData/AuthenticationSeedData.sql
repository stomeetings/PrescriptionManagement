-- Role
-- Seeds the four security roles enumerated as Actors in the approved Authentication
-- business specification (System Administrator, Doctor, Pharmacist, Receptionist).
-- Role.Code is the exact value embedded in the JWT role claim (see api-spec.md section 3.2).
MERGE INTO dbo.Role AS Target
USING (VALUES
    ('SYSTEM_ADMINISTRATOR', 'System Administrator', 1),
    ('DOCTOR',               'Doctor',               2),
    ('PHARMACIST',           'Pharmacist',           3),
    ('RECEPTIONIST',         'Receptionist',         4)
) AS Source (Code, DisplayText, DisplayOrder)
ON Target.Code = Source.Code
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Code, DisplayText, DisplayOrder, CreatedBy)
    VALUES (Source.Code, Source.DisplayText, Source.DisplayOrder, 'System');
GO

-- UserAccount
-- Seeds a single DEVELOPMENT-ONLY Administrator account so the application can be
-- logged into locally before a real user-provisioning workflow exists. This does not
-- resolve the open production bootstrap question flagged in the approved database
-- specification (section 14, section 20 item 2) - it exists solely for local development
-- and must never be run against a production database.
--
-- Development-only login credentials (DO NOT use outside local development):
--   Username: admin
--   Password: Admin@123!
--
-- Only the PBKDF2 hash of this password is ever inserted into the database - the
-- plain-text password above never touches a column. The hash below must be generated
-- using ASP.NET Core Identity's PasswordHasher<TUser> v3 format (PBKDF2-HMACSHA256,
-- 100,000 iterations, 16-byte salt, 32-byte subkey, base64-encoded), since T-SQL has
-- no equivalent primitive to compute this format itself.
--
-- REPLACE THE VALUE BELOW before running this script: 'REPLACE_WITH_GENERATED_HASH'
-- is a placeholder, not a usable hash, and will not authenticate anyone if left as-is.
DECLARE @AdminPasswordHash NVARCHAR(256) = 'REPLACE_WITH_GENERATED_HASH';

MERGE INTO dbo.UserAccount AS Target
USING (VALUES
    ('admin', @AdminPasswordHash, 'Default Administrator', 'SYSTEM_ADMINISTRATOR')
) AS Source (Username, PasswordHash, FullName, RoleCode)
ON Target.Username = Source.Username
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Username, PasswordHash, FullName, RoleId, CreatedBy)
    VALUES (
        Source.Username,
        Source.PasswordHash,
        Source.FullName,
        (SELECT RoleId FROM dbo.Role WHERE Code = Source.RoleCode),
        'System'
    );
GO
