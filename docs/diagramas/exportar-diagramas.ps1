# Exporta los diagramas Mermaid del módulo M3 a SVG y PNG.
# Requiere Node.js 20+ y Chrome o Edge instalados.
# Uso: .\docs\diagramas\exportar-diagramas.ps1

$ErrorActionPreference = 'Stop'

$diagramDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $diagramDir

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error 'No se encontro Node.js. Instalalo desde https://nodejs.org'
    exit 1
}

$chromeCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)

$browser = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

$puppeteerArgs = @()
if ($browser) {
    $puppeteerConfig = Join-Path $env:TEMP 'mmd-puppeteer-config.json'
    @{ executablePath = $browser; args = @('--no-sandbox') } | ConvertTo-Json | Set-Content -LiteralPath $puppeteerConfig -Encoding utf8
    $puppeteerArgs = @('-p', $puppeteerConfig)
    Write-Host "Usando navegador: $browser"
} else {
    Write-Host 'No se encontro Chrome ni Edge: Mermaid CLI va a descargar Chromium.'
}

$diagramas = Get-ChildItem -LiteralPath $diagramDir -Filter '*.mmd' | Sort-Object Name
if ($diagramas.Count -eq 0) {
    Write-Error 'No se encontraron archivos .mmd en esta carpeta.'
    exit 1
}

$fallidos = @()

foreach ($diagrama in $diagramas) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($diagrama.Name)
    Write-Host "Exportando $base ..."

    foreach ($formato in @('svg', 'png')) {
        $salida = Join-Path $diagramDir "$base.$formato"
        & npx -y @mermaid-js/mermaid-cli @puppeteerArgs -i $diagrama.FullName -o $salida -b white --scale 2

        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $salida)) {
            $fallidos += "$base.$formato"
        }
    }
}

Write-Host ''
Write-Host "Exportados: $($diagramas.Count) diagramas en SVG y PNG."

if ($fallidos.Count -gt 0) {
    Write-Warning "No se pudieron exportar: $($fallidos -join ', ')"
    exit 1
}