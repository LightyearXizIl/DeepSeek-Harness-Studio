# DeepSeek Harness Studio - one-command release (local-only tooling).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\release\release.ps1 -Version 0.0.2
#   powershell -ExecutionPolicy Bypass -File scripts\release\release.ps1 -Version 0.0.2 -DryRun
#
# Prerequisites (checked by the script):
#   - working tree is clean
#   - desktop\CHANGELOG.md already contains a "## [x.y.z]" section with the
#     release notes for this version (committed before running)
#   - a GitHub credential is available through Git Credential Manager
#
# What it does:
#   1. validates version/tag/changelog, bumps desktop package versions
#   2. runs the desktop test suite
#   3. cleans stale artifacts and builds the Windows installer
#   4. commits the version bump, tags vX.Y.Z, pushes master + tag
#   5. creates (or updates) the GitHub Release with the CHANGELOG section as
#      body, then uploads latest.yml + setup.exe + blockmap
#
# macOS assets are produced by the GitHub Actions workflow on the v* tag
# (requires the Apple signing secrets); this script covers the Windows leg.
#
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [switch]$DryRun,
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
# PS7+: native stderr must not abort the script.
$PSNativeCommandUseErrorActionPreference = $false

$Version = $Version.TrimStart('v')
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
  Write-Host "Invalid version '$Version' (expect x.y.z)" -ForegroundColor Red
  exit 1
}
$Tag = "v$Version"

$Repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # scripts/release -> repo root
$Desk = Join-Path $Repo 'desktop'
$Dist = Join-Path $Desk 'dist'
$UTF8 = New-Object System.Text.UTF8Encoding($false)

function Write-Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Write-OK($m)   { Write-Host "    $m" -ForegroundColor Green }
function Write-Bad($m)  { Write-Host "    $m" -ForegroundColor Red }
function Run-Git([string[]]$arguments) {
  & git -C $Repo @arguments
  if ($LASTEXITCODE -ne 0) { throw "git $($arguments[0]) failed (exit $LASTEXITCODE)" }
}

Write-Step "Release DeepSeek Harness Studio $Version (tag $Tag)"

# ---- 1. working tree + version + changelog checks ---------------------------
Write-Step '1. Checks'
$dirty = @(& git -C $Repo status --porcelain)
if ($dirty.Count -gt 0) {
  Write-Bad "Working tree is not clean ($($dirty.Count) entries). Commit or stash first."
  exit 2
}
Write-OK 'working tree clean'

$pkgJson = Get-Content -Raw (Join-Path $Desk 'package.json') | ConvertFrom-Json
if ($pkgJson.version -eq $Version) {
  Write-Bad "desktop/package.json is already at $Version. Pick a new version."
  exit 3
}
if ((& git -C $Repo tag -l $Tag).Count -gt 0) {
  Write-Bad "Tag $Tag already exists."
  exit 3
}
$changelog = Get-Content -Raw (Join-Path $Desk 'CHANGELOG.md')
if ($changelog -notmatch "## \[$Version\]") {
  Write-Bad "desktop/CHANGELOG.md has no '## [$Version]' section. Add the release notes and commit first."
  exit 3
}
Write-OK "version $Version / tag $Tag / changelog section present"

# ---- 2. bump versions -------------------------------------------------------
Write-Step "2. Bump desktop version to $Version"
if ($DryRun) {
  Write-Host "    [dry-run] node scripts\release\bump-version.mjs $Version"
} else {
  & node (Join-Path $PSScriptRoot 'bump-version.mjs') $Version $Desk
  if ($LASTEXITCODE -ne 0) { throw 'version bump failed' }
  Write-OK 'versions bumped'
}

# ---- 3. tests ---------------------------------------------------------------
if (-not $SkipTests) {
  Write-Step '3. Desktop test suite'
  if ($DryRun) {
    Write-Host '    [dry-run] npm test (desktop)'
  } else {
    Push-Location $Desk
    try {
      & npm.cmd test 2>&1 | Out-Host
      if ($LASTEXITCODE -ne 0) { throw 'desktop tests failed' }
    } finally { Pop-Location }
    Write-OK 'tests passed'
  }
}

# ---- 4. build the Windows installer -----------------------------------------
Write-Step '4. Build Windows installer'
if ($DryRun) {
  Write-Host "    [dry-run] clean dist + npm run package:win (desktop)"
} else {
  Get-ChildItem $Dist -Filter 'deepseek-harness-studio-*' -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue
  Push-Location $Desk
  try {
    & npm.cmd run package:win 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'package:win failed' }
  } finally { Pop-Location }
  $setup = Get-ChildItem $Dist -Filter "deepseek-harness-studio-$Version-windows-x64-setup.exe" |
    Select-Object -First 1
  if (-not $setup) { throw "installer not found: $Version" }
  Write-OK "installer built: $($setup.Name)"
}

# ---- 5. commit + tag + push -------------------------------------------------
Write-Step '5. Commit, tag, push'
if ($DryRun) {
  Write-Host '    [dry-run] git add desktop/package.json desktop/package-lock.json'
  Write-Host "    [dry-run] git commit -m \"release: v$Version\""
  Write-Host "    [dry-run] git tag $Tag"
  Write-Host '    [dry-run] git push origin master + tag'
} else {
  Run-Git @('add', 'desktop/package.json', 'desktop/package-lock.json')
  Run-Git @('commit', '-m', "release: v$Version")
  Run-Git @('tag', $Tag)
  Run-Git @('push', 'origin', 'master')
  Run-Git @('push', 'origin', $Tag)
  Write-OK "pushed master + tag $Tag"
}

# ---- 6. GitHub Release ------------------------------------------------------
Write-Step '6. Create/update GitHub Release + upload assets'
if ($DryRun) {
  Write-Host '    [dry-run] create release + upload latest.yml, setup.exe, blockmap'
  Write-OK 'DRY RUN COMPLETE - no changes were made'
  exit 0
}

$env:GCM_INTERACTIVE = 'Never'
$credOut = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$token = ($credOut | Select-String '^password=').Line.Substring(9)
if (-not $token) { throw 'No GitHub credential found via git credential fill.' }
$headers = @{ Authorization = "Bearer $token"; 'User-Agent' = 'dsh-studio-release' }

$notesMatch = [regex]::Match($changelog, "(?s)## \[$Version\].*?(?=## \[|\z)")
$notes = $notesMatch.Value.Trim()
$payload = @{
  tag_name = $Tag
  name = "DeepSeek Harness Studio $Tag"
  body = $notes
} | ConvertTo-Json -Compress
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)

$release = $null
try {
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/LightyearXizIl/DeepSeek-Harness-Studio/releases" `
    -Headers $headers -Method Post -Body $bodyBytes -ContentType 'application/json; charset=utf-8' -TimeoutSec 60
  Write-OK "release created: $($release.html_url)"
} catch {
  # Tag likely pushed moments ago and not yet visible, or release exists.
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/LightyearXizIl/DeepSeek-Harness-Studio/releases/tags/$Tag" `
    -Headers $headers -Method Get -TimeoutSec 60
  Write-Host '    release already exists, reusing it'
}

foreach ($assetName in @('latest.yml', "deepseek-harness-studio-$Version-windows-x64-setup.exe.blockmap", "deepseek-harness-studio-$Version-windows-x64-setup.exe")) {
  $assetPath = Join-Path $Dist $assetName
  Write-Host "    uploading $assetName ($([math]::Round((Get-Item $assetPath).Length / 1MB, 1)) MB)..."
  Invoke-RestMethod -Uri "https://uploads.github.com/repos/LightyearXizIl/DeepSeek-Harness-Studio/releases/$($release.id)/assets?name=$assetName" `
    -Headers $headers -Method Post -ContentType 'application/octet-stream' -InFile $assetPath -TimeoutSec 900 | Out-Null
  Write-OK "    uploaded $assetName"
}

Write-OK "RELEASE COMPLETE: $($release.html_url)"
Write-Host ''
Write-Host 'Notes:' -ForegroundColor Yellow
Write-Host '  - macOS (dmg/zip) assets are produced by the GitHub Actions workflow on the v* tag.'
Write-Host '  - The release body was taken from desktop/CHANGELOG.md; edit on GitHub if needed.'
Write-Host '  - Users can now update in-app via Settings -> Update (latest.yml points at this release).'
