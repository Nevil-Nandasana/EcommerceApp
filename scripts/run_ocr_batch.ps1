param(
    [string]$InputDir = "output/catalog/pages",
    [string]$OutputDir = "output/catalog/ocr"
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($t, $type) {
    $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($t))
    $task.Wait()
    return $task.Result
}

[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) {
    Write-Host "Error: No Windows OCR engine available."
    exit 1
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$files = Get-ChildItem -Path $InputDir -Filter "page_*.jpg" | Sort-Object { [int]($_.BaseName -replace '\D','') }
Write-Host "Running Windows Media OCR on $($files.Count) pages..."

foreach ($f in $files) {
    $outJsonPath = Join-Path $OutputDir "$($f.BaseName).json"
    if (Test-Path $outJsonPath) {
        continue
    }

    try {
        $fs = [System.IO.File]::OpenRead($f.FullName)
        $ras = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($fs)
        $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ras)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $ocrResult = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

        $lines = @()
        foreach ($line in $ocrResult.Lines) {
            $lines += $line.Text
        }

        $pageNumber = [int]($f.BaseName -replace '\D','')
        $outObj = @{
            page = $pageNumber
            text = $ocrResult.Text
            lines = $lines
        }

        $json = $outObj | ConvertTo-Json -Depth 5
        Set-Content -Path $outJsonPath -Value $json -Encoding UTF8
        $fs.Close()
        Write-Host "OCR completed for $($f.BaseName)"
    }
    catch {
        Write-Host "Failed OCR for $($f.Name): $_"
        if ($fs) { $fs.Close() }
    }
}
Write-Host "All OCR batches finished."
