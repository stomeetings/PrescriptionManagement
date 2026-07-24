using Prescription.Application.Prescriptions.Pdf;
using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace Prescription.Infrastructure.Prescriptions.Pdf;

// Drives a real headless Chromium instance (PuppeteerSharp) to render the XHTML and
// print it to PDF - the same rendering engine class the browser preview/print already
// use (Steps 18.2/18.3), which is what actually makes "must match the XHTML preview
// exactly" achievable. Emulates print media so the @media print rules already built
// into PrescriptionStyle.css (Step 18.1 - A4 size, margins, page-break-inside: avoid on
// medication rows, the @page page-number counters) apply exactly as they do when a
// clinician prints from the browser - no separate PDF-specific layout logic exists here
// or anywhere else.
//
// Registered as a Singleton (see DependencyInjection.cs) and launches the browser once,
// lazily, on first use - not per request, since starting a Chromium process is
// expensive. IAsyncDisposable so the host can close it cleanly on shutdown.
public class PrescriptionPdfGenerator : IPrescriptionPdfGenerator, IAsyncDisposable
{
    private readonly SemaphoreSlim _browserLock = new(1, 1);
    private IBrowser? _browser;

    public async Task<byte[]> GeneratePdfAsync(string xhtml)
    {
        var browser = await GetBrowserAsync();

        await using var page = await browser.NewPageAsync();
        await page.SetContentAsync(xhtml);

        // Print media, not screen media - PrescriptionStyle.css's @media print block
        // (fixed-position repeating header/footer, page counters, black-and-white
        // layout) only applies under this emulation, exactly matching what
        // contentWindow.print() already renders in the browser (Step 18.3).
        await page.EmulateMediaTypeAsync(MediaType.Print);

        var pdfBytes = await page.PdfDataAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            PrintBackground = true,
            // Header/footer are already part of the XHTML/CSS itself (position: fixed,
            // repeated per page - Step 18.1) - Puppeteer's own header/footer template
            // feature would duplicate them, not add anything.
            DisplayHeaderFooter = false,
            MarginOptions = new MarginOptions { Top = "0", Bottom = "0", Left = "0", Right = "0" },
        });

        return pdfBytes;
    }

    private async Task<IBrowser> GetBrowserAsync()
    {
        if (_browser is { IsConnected: true })
        {
            return _browser;
        }

        await _browserLock.WaitAsync();
        try
        {
            if (_browser is { IsConnected: true })
            {
                return _browser;
            }

            await new BrowserFetcher().DownloadAsync();
            _browser = await Puppeteer.LaunchAsync(new LaunchOptions
            {
                Headless = true,
                Args = ["--no-sandbox"],
            });

            return _browser;
        }
        finally
        {
            _browserLock.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_browser is not null)
        {
            await _browser.CloseAsync();
        }

        _browserLock.Dispose();
    }
}
