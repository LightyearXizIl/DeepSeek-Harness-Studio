# DeepSeek Harness Studio - upstream sync (local-only; upstream never touches this file)
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\sync\sync-upstream.ps1          # full sync
#   powershell -ExecutionPolicy Bypass -File scripts\sync\sync-upstream.ps1 -CheckOnly  # fetch + report only
#
# Behavior (see docs/INTEGRATION.md section 4.4 / 6.4):
#   - refuses to run when the working tree is dirty (never discards local work)
#   - Channel A: merge upstream/master (official deepseek-harness)
#   - Channel B: subtree pull desktop from desktop-upstream/main (official dsh-desktop)
#   - conflicts -> writes CONFLICT-REPORT.md and stops (never auto-resolves)
#   - feature-protection check -> warns when protected local features are touched
#   - feature-overlap scan -> flags upstream changes that resemble local features
#   - writes UPDATE-SUMMARY.md on success
#
param(
  [switch]$CheckOnly
)

# PS7+: native commands writing to stderr must NOT abort the script
# (git progress lines go to stderr). We rely on $LASTEXITCODE instead.
$PSNativeCommandUseErrorActionPreference = $false
$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # scripts/sync -> repo root

function Write-Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Write-OK($m)   { Write-Host "    $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "    $m" -ForegroundColor Yellow }
function Write-Bad($m)  { Write-Host "    $m" -ForegroundColor Red }

$UTF8 = New-Object System.Text.UTF8Encoding($false)
function Write-Utf8File([string]$path, [string]$content) {
  [System.IO.File]::WriteAllText($path, $content, $UTF8)
}

$SUMMARY = Join-Path $PSScriptRoot 'UPDATE-SUMMARY.md'
$CONFLICT = Join-Path $PSScriptRoot 'CONFLICT-REPORT.md'

# ---- 6.4 protected local features -------------------------------------------
$protectedFiles = @(
  'packages/llm/llm-deepseek/src/index.ts',
  'packages/llm/llm-deepseek/src/adapter.ts',
  'packages/host/apiproxy/src/api-proxy.ts'
)
$protectedPrefixes = @(
  'desktop/build/dsh-local.patch.yml',
  'desktop/vendor/',
  'desktop/src/main/studio-local.ts',
  'packages/client/ui-aqua/',
  'scripts/sync/',
  'docs/INTEGRATION.md'
)
$overlapKeywords = @('image', 'vision', 'visual', 'theme', 'aqua', 'publish', 'update')

function Is-Protected([string]$path) {
  foreach ($p in $protectedFiles) { if ($path -eq $p) { return $true } }
  foreach ($p in $protectedPrefixes) { if ($path.StartsWith($p)) { return $true } }
  return $false
}

function Invoke-Git([string[]]$arguments) {
  # Do NOT merge stderr (2>&1): under Windows PowerShell 5.1 that turns git's
  # progress lines into ErrorRecords that abort with $ErrorActionPreference=Stop.
  # Let stderr pass through to the console and judge success via $LASTEXITCODE.
  & git -C $Repo @arguments
  return $LASTEXITCODE
}

function Get-Unmerged {
  $out = & git -C $Repo diff --name-only --diff-filter=U 2>$null
  return @($out | Where-Object { $_ })
}

function Write-ConflictReport([string]$channel, [string[]]$files, [string[]]$details) {
  $report = @(
    "# CONFLICT-REPORT - $channel"
    ''
    "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    ''
    'Sync stopped. NO conflict was auto-resolved. Review each file, decide, then'
    'resolve and commit manually (or ask the agent).'
    ''
    '## Conflicted files'
    ($files | ForEach-Object { "- `$_" })
    ''
    '## Local feature protection'
    ($details | ForEach-Object { "- $_" })
    ''
    '## Decision checklist (one per file)'
    '| File | Take upstream | Keep local | Manual merge |'
    '| --- | --- | --- | --- |'
    ($files | ForEach-Object { "| `$_ | [ ] | [ ] | [ ] |" })
  )
  $report -join "`n" | ForEach-Object { Write-Utf8File $CONFLICT $_ }
}

# ---- 1. clean tree check -----------------------------------------------------
Write-Step '1. Working tree check'
$dirty = @(& git -C $Repo status --porcelain)
if ($dirty.Count -gt 0) {
  Write-Bad "Working tree is not clean ($($dirty.Count) entries). Commit or stash local work first."
  exit 2
}
Write-OK 'clean'

# ---- 2. fetch ---------------------------------------------------------------
Write-Step '2. Fetching upstreams'
$code = Invoke-Git @('fetch', 'upstream')
if ($code -ne 0) { Write-Bad 'fetch upstream failed'; exit 3 }
$code = Invoke-Git @('fetch', 'desktop-upstream')
if ($code -ne 0) { Write-Bad 'fetch desktop-upstream failed'; exit 3 }
Write-OK 'fetched'

$newHarness = @(& git -C $Repo rev-list --count 'HEAD..upstream/master')
$newDesktop = @(& git -C $Repo rev-list --count 'HEAD..desktop-upstream/main')
Write-Host "    harness new commits: $newHarness | desktop new commits: $newDesktop"

if ([int]$newHarness[0] -eq 0 -and [int]$newDesktop[0] -eq 0) {
  Write-OK 'Both upstreams are up to date.'
  if (-not $CheckOnly) {
    Write-Utf8File $SUMMARY "No updates. Checked $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  }
  exit 0
}

if ($CheckOnly) {
  Write-Warn '-CheckOnly: stopping before merging. Run without -CheckOnly to merge.'
  exit 0
}

$summary = @()
$blocked = @()

# ---- 3. Channel A: harness ---------------------------------------------------
if ([int]$newHarness[0] -gt 0) {
  Write-Step "3. Channel A: merge upstream/master (+$($newHarness[0]) commits)"
  $before = (& git -C $Repo rev-parse HEAD)
  $code = Invoke-Git @('merge', 'upstream/master', '--no-edit')
  if ($code -ne 0) {
    $unmerged = Get-Unmerged
    $details = @()
    foreach ($f in $unmerged) { if (Is-Protected $f) { $details += "PROTECTED local feature touched: $f" } }
    if ($details.Count -eq 0) { $details += 'No protected files involved (plain upstream conflict).' }
    Write-ConflictReport 'Channel A (harness)' $unmerged $details
    Write-Bad "Channel A conflict - CONFLICT-REPORT.md written. Resolve manually, do not auto-resolve."
    exit 4
  }
  $changed = @(& git -C $Repo diff --name-only "$before..HEAD")
  $summary += "## Channel A: harness merged (upstream commits: $($newHarness[0]))"
  foreach ($f in $changed) {
    if (Is-Protected $f) { $summary += "- PROTECTED: $f - verify local feature still intact" }
    else { $summary += "- $f" }
  }
  Write-OK "merged ($($changed.Count) files changed)"
}

# ---- 4. Channel B: desktop subtree -------------------------------------------
if ([int]$newDesktop[0] -gt 0) {
  Write-Step "4. Channel B: subtree pull desktop (+$($newDesktop[0]) commits)"
  $before = (& git -C $Repo rev-parse HEAD)
  $code = Invoke-Git @('subtree', 'pull', '--squash', '--prefix=desktop', 'desktop-upstream', 'main')
  if ($code -ne 0) {
    $unmerged = Get-Unmerged
    $details = @()
    foreach ($f in $unmerged) { if (Is-Protected $f) { $details += "PROTECTED local feature touched: $f" } }
    if ($details.Count -eq 0) { $details += 'No protected files involved (plain upstream conflict).' }
    Write-ConflictReport 'Channel B (desktop)' $unmerged $details
    Write-Bad "Channel B conflict - CONFLICT-REPORT.md written. Resolve manually, do not auto-resolve."
    exit 5
  }
  $changed = @(& git -C $Repo diff --name-only "$before..HEAD")
  $summary += "## Channel B: desktop subtree pulled (upstream commits: $($newDesktop[0]))"
  foreach ($f in $changed) {
    if (Is-Protected $f) { $summary += "- PROTECTED: $f - verify local feature still intact" }
    else { $summary += "- $f" }
  }
  Write-OK "merged ($($changed.Count) files changed)"
}

# ---- 5. feature overlap scan (6.4) -------------------------------------------
Write-Step '5. Feature-overlap scan'
$allChanged = @(& git -C $Repo diff --name-only 'HEAD@{1}..HEAD') + @()
if ($allChanged.Count -eq 0) { $allChanged = @(& git -C $Repo diff --name-only 'HEAD^..HEAD') + @() }
$hits = @()
foreach ($f in $allChanged) {
  if (Is-Protected $f) { continue }
  $content = & git -C $Repo diff "HEAD@{1}..HEAD" -- $f 2>$null
  foreach ($kw in $overlapKeywords) {
    if (($content -join "`n") -match $kw) { $hits += "$f (keyword: $kw)"; break }
  }
}
if ($hits.Count -gt 0) {
  $summary += "## Feature-overlap candidates (review needed)"
  foreach ($h in $hits) { $summary += "- $h" }
  Write-Warn "Possible feature overlap detected - see UPDATE-SUMMARY.md, ask the agent for a feature-compare report."
} else {
  Write-OK 'no overlap candidates'
}

# ---- 6. summary --------------------------------------------------------------
Write-Utf8File $SUMMARY ($summary -join "`n")
Write-OK "UPDATE-SUMMARY.md written. Next: run tests/build, then push to origin."
