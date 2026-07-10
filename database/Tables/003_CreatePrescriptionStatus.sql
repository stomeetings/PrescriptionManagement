CREATE TABLE dbo.PrescriptionStatus
(
    PrescriptionStatusId INT IDENTITY(1,1) NOT NULL,
    Code                 NVARCHAR(50)      NOT NULL,
    DisplayText           NVARCHAR(150)     NOT NULL,
    DisplayOrder          INT               NOT NULL,
    IsActive              BIT               NOT NULL CONSTRAINT DF_PrescriptionStatus_IsActive DEFAULT (1),
    CreatedDate           DATETIME2         NOT NULL CONSTRAINT DF_PrescriptionStatus_CreatedDate DEFAULT (SYSUTCDATETIME()),
    CreatedBy             NVARCHAR(100)     NOT NULL,
    UpdatedDate           DATETIME2         NULL,
    UpdatedBy             NVARCHAR(100)     NULL,
    IsDeleted             BIT               NOT NULL CONSTRAINT DF_PrescriptionStatus_IsDeleted DEFAULT (0),

    CONSTRAINT PK_PrescriptionStatus PRIMARY KEY CLUSTERED (PrescriptionStatusId),
    CONSTRAINT UQ_PrescriptionStatus_Code UNIQUE (Code)
);
GO
