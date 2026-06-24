<#
.SYNOPSIS
  Fetcht club-, course-, tee- en hole-data uit de eGolf4u API via curl.exe.

.GEBRUIK
  .\scripts\fetch-egolf4u.ps1 -Cookie "EGOLF4USESSID=...; has_teetime=j; username=...; club=..."
#>

param(
  [Parameter(Mandatory)]
  [string]$Cookie,
  [string]$ApiBase = "https://m.eg4u.nl",
  [string]$OutputDir = "$PSScriptRoot\..\data\egolf4u",
  [switch]$Force
)

$null = New-Item -ItemType Directory -Path $OutputDir -Force

function Coalesce { param([object]$a, [object]$b) if ($null -ne $a -and "$a" -ne '') { $a } else { $b } }

function Invoke-Api($path) {
  $url = "$ApiBase$path"
  $raw = & curl.exe -s -H "Cookie: $Cookie" -H "Accept: application/json" -H "Referer: $ApiBase/" -H "Accept-Language: nl" $url
  if ($LASTEXITCODE -ne 0) { return $null }
  if (-not $raw) { return $null }
  return ($raw | ConvertFrom-Json)
}

# === Stap 1: Clubs ===
Write-Host "Stap 1/4 — Clubs ophalen..." -ForegroundColor Cyan
$clubs = Invoke-Api "/api/clubs/foreign"
if (-not $clubs) { Write-Error "Clubs ophalen mislukt"; exit 1 }
if ($clubs -isnot [array]) { $clubs = @($clubs) }
$clubs | ConvertTo-Json -Depth 5 | Out-File "$OutputDir/clubs.json" -Encoding utf8
Write-Host "  $($clubs.Count) clubs" -ForegroundColor Green

# === Stap 2-4: Per club ===
$combined = @()
$done = 0; $errors = 0; $i = 0

foreach ($club in $clubs) {
  $i++
  $clubId   = Coalesce $club.id $club.club_id
  $clubName = Coalesce (Coalesce $club.naam $club.club_name) $clubId
  $clubFile = "$OutputDir\club-$clubId.json"

  if ((Test-Path $clubFile) -and -not $Force) {
    try { $combined += Get-Content $clubFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch {}
    Write-Host "  ($i/$($clubs.Count)) $clubName — al gedownload" -ForegroundColor DarkGray
    $done++; continue
  }

  Write-Host "  ($i/$($clubs.Count)) $clubName — courses..." -NoNewline

  $courses = Invoke-Api "/api/clubs/foreign/$clubId/courses"
  if (-not $courses) { Write-Host " courses leeg" -ForegroundColor Yellow; $errors++; continue }
  if ($courses -isnot [array]) { $courses = @($courses) }

  $courseData = @()
  foreach ($course in $courses) {
    $courseId   = Coalesce $course.id $course.course_id
    $courseName = Coalesce (Coalesce (Coalesce $course.naam $course.name) $course.course_name) $courseId

    $tees = Invoke-Api "/api/foreign/courses/$courseId/tees"
    if ($tees -and $tees -isnot [array]) { $tees = @($tees) }

    $teeData = @()
    foreach ($tee in @($tees)) {
      $teeId   = Coalesce $tee.id $tee.tee_id
      $teeName = Coalesce $tee.naam $tee.tee_name
      $holes   = Invoke-Api "/api/foreign/courses/$courseId/tees/$teeId/holes"
      $teeData += @{ tee_id = $teeId; tee_name = $teeName; holes = $holes }
    }

    $courseData += @{ course_id = $courseId; course_name = $courseName; tees = $teeData }
  }

  $clubRecord = @{ club_id = $clubId; club_name = $clubName; courses = $courseData }
  $clubRecord | ConvertTo-Json -Depth 10 | Out-File $clubFile -Encoding utf8
  $combined += $clubRecord

  Write-Host " $($courseData.Count) course(s)" -ForegroundColor Green
  $done++
  Start-Sleep -Milliseconds 300
}

# Combined
$combined | ConvertTo-Json -Depth 10 | Out-File "$OutputDir\combined.json" -Encoding utf8

Write-Host "`n" + ("=" * 50)
Write-Host "Gereed:" -ForegroundColor Green
Write-Host "  Clubs:    $done"
Write-Host "  Fouten:   $errors"
Write-Host "  Output:   $OutputDir"
