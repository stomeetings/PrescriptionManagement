namespace Prescription.Application.Repositories;

public interface IPrescriptionVersionRepository
{
    Task<IEnumerable<PrescriptionVersionSummary>> GetAllAsync(int prescriptionId);

    Task<PrescriptionVersionDetail> GetByVersionAsync(int prescriptionId, int versionNumber);

    // Creates a new latest version whose content matches versionNumber's historical
    // snapshot - never overwrites or deletes an existing PrescriptionVersion row (see
    // usp_Prescription_RestoreVersion's own comment).
    Task<PrescriptionRestoreResult> RestoreAsync(int prescriptionId, int versionNumber, string restoredBy);
}
