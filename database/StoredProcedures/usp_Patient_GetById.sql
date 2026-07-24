CREATE OR ALTER PROCEDURE dbo.usp_Patient_GetById
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.PatientId,
        p.PatientNumber,
        p.FirstName,
        p.LastName,
        p.PreferredName,
        p.DateOfBirth,
        p.GenderId,
        g.Code AS GenderCode,
        g.DisplayText AS GenderDisplayText,
        p.MobileNumber,
        p.Email,
        p.AddressLine1,
        p.AddressLine2,
        p.City,
        p.Region,
        p.PostalCode,
        p.Country,
        p.NHINumber,
        p.NZMCNumber,
        p.IsActive,
        p.Notes,
        p.CreatedDate,
        p.CreatedBy,
        p.UpdatedDate,
        p.UpdatedBy,
        p.RowVersion
    FROM dbo.Patient AS p
    INNER JOIN dbo.Gender AS g ON g.GenderId = p.GenderId
    WHERE p.PatientId = @PatientId
      AND p.IsDeleted = 0;
END
GO
