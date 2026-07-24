using Microsoft.Extensions.Caching.Memory;
using Prescription.Application.Exceptions;
using Prescription.Application.Repositories;

namespace Prescription.Application.Prescriptions.Pdf;

// Orchestrates fetching a saved Prescription, generating (or reusing a cached) PDF, and
// logging the download - all business logic, none of it in PrescriptionPdfGenerator
// (pure XHTML-to-bytes conversion, no database access) or the Controller (thin HTTP
// layer only), matching this project's established layering.
public class PrescriptionPdfService : IPrescriptionPdfService
{
    // "Cache generated PDF until the draft changes" (Step 18.6's own Performance
    // requirement) - keyed by PrescriptionId + RowVersion, so the cache entry is
    // naturally invalidated the moment a future Edit capability changes RowVersion,
    // without this service needing to know anything about how or when that happens.
    // Bounded by a sliding expiration so an unbounded number of distinct
    // Prescription+RowVersion combinations can't grow the cache forever.
    private static readonly MemoryCacheEntryOptions CacheEntryOptions = new()
    {
        SlidingExpiration = TimeSpan.FromMinutes(30),
    };

    private readonly IPrescriptionRepository _prescriptionRepository;
    private readonly IPrescriptionPdfGenerator _pdfGenerator;
    private readonly IMemoryCache _cache;

    public PrescriptionPdfService(IPrescriptionRepository prescriptionRepository, IPrescriptionPdfGenerator pdfGenerator, IMemoryCache cache)
    {
        _prescriptionRepository = prescriptionRepository;
        _pdfGenerator = pdfGenerator;
        _cache = cache;
    }

    public async Task<PrescriptionPdfResult> GetPdfAsync(int prescriptionId, string generatedBy)
    {
        var prescription = await _prescriptionRepository.GetByIdAsync(prescriptionId);
        if (prescription is null)
        {
            throw new PrescriptionNotFoundException();
        }

        var cacheKey = $"prescription-pdf:{prescriptionId}:{Convert.ToBase64String(prescription.RowVersion)}";

        if (!_cache.TryGetValue(cacheKey, out byte[]? pdfBytes) || pdfBytes is null)
        {
            pdfBytes = await _pdfGenerator.GeneratePdfAsync(prescription.Xhtml);
            _cache.Set(cacheKey, pdfBytes, CacheEntryOptions);
        }

        // Logged on every call, cache hit or miss - "Download Count" (Step 18.6's Audit
        // requirement) counts actual downloads, not PDF (re)generation events.
        var downloadCount = await _prescriptionRepository.LogPdfGeneratedAsync(prescriptionId, generatedBy);

        return new PrescriptionPdfResult
        {
            PdfBytes = pdfBytes,
            FileName = $"{prescription.PrescriptionNumber}.pdf",
            DownloadCount = downloadCount,
        };
    }
}
