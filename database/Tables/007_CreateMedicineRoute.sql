CREATE TABLE dbo.MedicineRoute
(
    MedicineRouteId INT IDENTITY(1,1) NOT NULL,
    Code            NVARCHAR(50)      NOT NULL,
    DisplayText     NVARCHAR(150)     NOT NULL,
    DisplayOrder    INT               NOT NULL,
    IsActive        BIT               NOT NULL CONSTRAINT DF_MedicineRoute_IsActive DEFAULT (1),
    CreatedDate     DATETIME2         NOT NULL CONSTRAINT DF_MedicineRoute_CreatedDate DEFAULT (SYSUTCDATETIME()),
    CreatedBy       NVARCHAR(100)     NOT NULL,
    UpdatedDate     DATETIME2         NULL,
    UpdatedBy       NVARCHAR(100)     NULL,
    IsDeleted       BIT               NOT NULL CONSTRAINT DF_MedicineRoute_IsDeleted DEFAULT (0),

    CONSTRAINT PK_MedicineRoute PRIMARY KEY CLUSTERED (MedicineRouteId),
    CONSTRAINT UQ_MedicineRoute_Code UNIQUE (Code)
);
GO
