<#
.SYNOPSIS
    Deploy Study With B to GitHub Pages.

.DESCRIPTION
    Bumps the service worker cache version, syncs all source files
    to docs/, stages everything, and pushes to main in one step.

.PARAMETER Message
    The git commit message. Required.

.EXAMPLE
    .\deploy.ps1 "feat: add new feature"
#>
param(
    [Parameter(Mandatory = $true, HelpMessage = "Enter a commit message")]
    [string]$Message
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot

# ─── 1. Bump service worker cache version ─────────────────────────────────────
$swPath = Join-Path $Root "sw.js"
$swContent = Get-Content $swPath -Raw

if ($swContent -match 'CACHE_VERSION = "v(\d+)"') {
    $oldVersion = [int]$Matches[1]
    $newVersion = $oldVersion + 1
    $swContent = $swContent -replace "CACHE_VERSION = `"v$oldVersion`"", "CACHE_VERSION = `"v$newVersion`""
    Set-Content $swPath $swContent -NoNewline
    Write-Host "SW cache: v$oldVersion → v$newVersion" -ForegroundColor Cyan
} else {
    Write-Warning "Could not find CACHE_VERSION in sw.js. Service worker not bumped."
}

# ─── 2. Sync source files to docs/ ────────────────────────────────────────────
$docsPath = Join-Path $Root "docs"
$filesToSync = @("index.html", "style.css", "app.js", "manifest.json", "sw.js")

foreach ($file in $filesToSync) {
    $src = Join-Path $Root $file
    $dst = Join-Path $docsPath $file
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
    }
}

$iconsSource = Join-Path $Root "icons"
$iconsDest   = Join-Path $docsPath "icons"
if (Test-Path $iconsSource) {
    New-Item -ItemType Directory -Force -Path $iconsDest | Out-Null
    Copy-Item "$iconsSource\*" $iconsDest -Recurse -Force
}

Write-Host "Synced source → docs/" -ForegroundColor Cyan

# ─── 3. Stage, commit, and push ───────────────────────────────────────────────
Push-Location $Root

try {
    git add -A
    git commit -m $Message
    git push origin main
    Write-Host "`nDeployed successfully. Pages will update in ~1 minute." -ForegroundColor Green
    Write-Host "https://thebusisiwe.github.io/studywithb/" -ForegroundColor Green
} finally {
    Pop-Location
}
