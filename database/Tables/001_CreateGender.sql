CREATE TABLE dbo.Gender
(
    GenderId      INT IDENTITY(1,1) NOT NULL,
    Code          NVARCHAR(50)      NOT NULL,
    DisplayText   NVARCHAR(150)     NOT NULL,
    DisplayOrder  INT               NOT NULL,
    IsActive      BIT               NOT NULL CONSTRAINT DF_Gender_IsActive DEFAULT (1),
    CreatedDate   DATETIME2         NOT NULL CONSTRAINT DF_Gender_CreatedDate DEFAULT (SYSUTCDATETIME()),
    CreatedBy     NVARCHAR(100)     NOT NULL,
    UpdatedDate   DATETIME2         NULL,
    UpdatedBy     NVARCHAR(100)     NULL,
    IsDeleted     BIT               NOT NULL CONSTRAINT DF_Gender_IsDeleted DEFAULT (0),

    CONSTRAINT PK_Gender PRIMARY KEY CLUSTERED (GenderId),
    CONSTRAINT UQ_Gender_Code UNIQUE (Code)
);
GO
