CREATE TABLE dbo.UserAccount
(
    UserAccountId INT IDENTITY(1,1) NOT NULL,
    Username      NVARCHAR(100)     NOT NULL,
    PasswordHash  NVARCHAR(256)     NOT NULL,
    FullName      NVARCHAR(200)     NOT NULL,
    RoleId        INT               NOT NULL,
    IsActive      BIT               NOT NULL CONSTRAINT DF_UserAccount_IsActive DEFAULT (1),
    CreatedDate   DATETIME2         NOT NULL CONSTRAINT DF_UserAccount_CreatedDate DEFAULT (SYSUTCDATETIME()),
    CreatedBy     NVARCHAR(100)     NOT NULL,
    UpdatedDate   DATETIME2         NULL,
    UpdatedBy     NVARCHAR(100)     NULL,
    IsDeleted     BIT               NOT NULL CONSTRAINT DF_UserAccount_IsDeleted DEFAULT (0),

    CONSTRAINT PK_UserAccount PRIMARY KEY CLUSTERED (UserAccountId),
    CONSTRAINT UQ_UserAccount_Username UNIQUE (Username),
    CONSTRAINT FK_UserAccount_Role FOREIGN KEY (RoleId) REFERENCES dbo.Role (RoleId)
);
GO

CREATE NONCLUSTERED INDEX IX_UserAccount_RoleId ON dbo.UserAccount (RoleId);
GO
