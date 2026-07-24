using Prescription.Application.Prescriptions.Versioning;
using Prescription.Application.Repositories;

namespace Prescription.Application.Services;

public class PrescriptionVersionService : IPrescriptionVersionService
{
    private readonly IPrescriptionVersionRepository _prescriptionVersionRepository;

    public PrescriptionVersionService(IPrescriptionVersionRepository prescriptionVersionRepository)
    {
        _prescriptionVersionRepository = prescriptionVersionRepository;
    }

    public Task<IEnumerable<PrescriptionVersionSummary>> GetAllAsync(int prescriptionId)
        => _prescriptionVersionRepository.GetAllAsync(prescriptionId);

    public Task<PrescriptionVersionDetail> GetByVersionAsync(int prescriptionId, int versionNumber)
        => _prescriptionVersionRepository.GetByVersionAsync(prescriptionId, versionNumber);

    public async Task<PrescriptionVersionComparisonResult> CompareAsync(int prescriptionId, int fromVersionNumber, int toVersionNumber)
    {
        var from = await _prescriptionVersionRepository.GetByVersionAsync(prescriptionId, fromVersionNumber);
        var to = await _prescriptionVersionRepository.GetByVersionAsync(prescriptionId, toVersionNumber);

        var result = new PrescriptionVersionComparisonResult
        {
            PrescriptionId = prescriptionId,
            FromVersionNumber = fromVersionNumber,
            ToVersionNumber = toVersionNumber,
            FromClinicalNotes = from.ClinicalNotes,
            ToClinicalNotes = to.ClinicalNotes,
            ClinicalNotesChanged = !string.Equals(from.ClinicalNotes ?? string.Empty, to.ClinicalNotes ?? string.Empty, StringComparison.Ordinal)
        };

        var fromByMedicine = from.Items.ToDictionary(item => item.MedicineId);
        var toByMedicine = to.Items.ToDictionary(item => item.MedicineId);

        // Identity = MedicineId, mirroring usp_Prescription_UpdateDraft's own
        // change-detection rule - a medicine present in both sets but with a different
        // Dose/Frequency/Duration/Quantity/Instructions counts as "changed", not
        // "removed + added".
        foreach (var toItem in to.Items)
        {
            if (!fromByMedicine.TryGetValue(toItem.MedicineId, out var fromItem))
            {
                result.MedicationsAdded.Add(toItem);
                continue;
            }

            var changedFields = new List<string>();
            if (fromItem.Dose != toItem.Dose) changedFields.Add("Dose");
            if (fromItem.FrequencyId != toItem.FrequencyId) changedFields.Add("Frequency");
            if (fromItem.Duration != toItem.Duration) changedFields.Add("Duration");
            if (fromItem.Quantity != toItem.Quantity) changedFields.Add("Quantity");
            if (!string.Equals(fromItem.Instructions ?? string.Empty, toItem.Instructions ?? string.Empty, StringComparison.Ordinal))
            {
                changedFields.Add("Instructions");
            }

            if (changedFields.Count > 0)
            {
                result.MedicationsChanged.Add(new PrescriptionVersionItemChange
                {
                    Before = fromItem,
                    After = toItem,
                    ChangedFields = changedFields
                });
            }
            else
            {
                result.MedicationsUnchanged.Add(toItem);
            }
        }

        foreach (var fromItem in from.Items)
        {
            if (!toByMedicine.ContainsKey(fromItem.MedicineId))
            {
                result.MedicationsRemoved.Add(fromItem);
            }
        }

        return result;
    }

    public Task<PrescriptionRestoreResult> RestoreAsync(int prescriptionId, int versionNumber, string restoredBy)
        => _prescriptionVersionRepository.RestoreAsync(prescriptionId, versionNumber, restoredBy);
}
