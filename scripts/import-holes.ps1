<#
.SYNOPSIS
  Importeert tee's, holes, loops en loop_holes uit eGolf4u JSON naar Supabase.

.DESCRIPTION
  Verwerkt de gedetailleerde baanstructuur:
    club → courses → tees → holes

  Elke club wordt als course (locatie) in de database verwacht
  (eerder aangemaakt via import-clubs.ps1). Dit script vult aan:
    - tees (afslagplaatsen)
    - holes (individuele speelbanen)
    - loops (lussen: full 18, front 9, back 9)
    - loop_holes (koppeling holes aan loop in volgorde)

.VEREISTEN
  - apps/web/.env.local met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY
  - JSON bestand met eGolf4u club → courses → tees → holes structuur
  - Courses (clubs) moeten al bestaan in de database

.VOORBEELD
  .\scripts\import-holes.ps1 -JsonPad .\data\egolf4u-course-details.json
#>

param(
  [Parameter(Mandatory)]
  [string]$JsonPad
)

# === Laad .env.local ===
$envLines = Get-Content "$PSScriptRoot\..\apps\web\.env.local"
$envHash = @{}
foreach ($line in $envLines) {
  if ($line -match '^([^=]+)=(.*)') { $envHash[$Matches[1]] = $Matches[2] }
}
$supabaseUrl = $envHash['NEXT_PUBLIC_SUPABASE_URL']
$serviceRoleKey = $envHash['SUPABASE_SERVICE_ROLE_KEY']

if (-not $supabaseUrl -or -not $serviceRoleKey) {
  Write-Error "Ontbrekende variabelen in apps/web/.env.local"
  exit 1
}

$headers = @{ apikey = $serviceRoleKey; Authorization = "Bearer $serviceRoleKey" }
$contentType = "application/json; charset=utf-8"

$coursesUrl   = "$supabaseUrl/rest/v1/courses"
$teesUrl      = "$supabaseUrl/rest/v1/tees"
$holesUrl     = "$supabaseUrl/rest/v1/holes"
$loopsUrl     = "$supabaseUrl/rest/v1/loops"
$loopHolesUrl = "$supabaseUrl/rest/v1/loop_holes"

# === Lees JSON ===
if (-not (Test-Path $JsonPad)) {
  Write-Error "Bestand niet gevonden: $JsonPad"
  exit 1
}
$clubs = Get-Content $JsonPad -Raw -Encoding UTF8 | ConvertFrom-Json
if ($clubs -isnot [array]) { $clubs = @($clubs) }

$stats = @{ courses = 0; tees = 0; holes = 0; loops = 0; loop_holes = 0; errors = 0 }

function Invoke-Upsert($url, $row, $lookupQuery) {
  try {
    $body = @($row) | ConvertTo-Json -Compress
    $result = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType $contentType -Headers $headers -ErrorAction Stop
    return @{ id = $result[0].id; created = $true }
  } catch {
    if ($lookupQuery) {
      try {
        $existing = Invoke-RestMethod -Uri "$url`?$lookupQuery&select=id" -Method Get -Headers $headers -ErrorAction Stop
        if ($existing -and $existing.Count -gt 0) {
          $id = $existing[0].id
          $body = @($row) | ConvertTo-Json -Compress
          $null = Invoke-RestMethod -Uri "$url`?id=eq.$id" -Method Patch -Body $body -ContentType $contentType -Headers $headers -ErrorAction Stop
          return @{ id = $id; created = $false }
        }
      } catch {}
    }
    return $null
  }
}

# Bepaal loop-categorie op basis van naam
function Get-LoopType($courseName) {
  if ($courseName -match '18') { return 'full_18' }
  if ($courseName -match '^1e|^voorste|front') { return 'front_9' }
  if ($courseName -match '^2e|^achterste|back') { return 'back_9' }
  return 'custom'
}

Write-Host "`n$($clubs.Count) club(s) gevonden in JSON`n"

foreach ($club in $clubs) {
  Write-Host "  $($club.club_name) ($($club.courses.Count) layout(s))" -ForegroundColor Cyan

  # 1. Vind bestaande course (geimporteerd via import-clubs.ps1)
  $courseRow = $null
  try {
    $courseRow = Invoke-RestMethod -Uri "$coursesUrl`?external_id=eq.$($club.club_id)&select=id,name" -Method Get -Headers $headers -ErrorAction Stop
  } catch {}
  if (-not $courseRow -or $courseRow.Count -eq 0) {
    Write-Host "    Course (club) niet gevonden met external_id=$($club.club_id), overslaan" -ForegroundColor Yellow
    $stats.errors++
    continue
  }
  $courseId = $courseRow[0].id
  $stats.courses++

  # 2. Categoriseer layouts
  $layouts = @{ full_18 = $null; front_9 = $null; back_9 = $null; custom = @() }
  foreach ($c in $club.courses) {
    $type = Get-LoopType $c.course_name
    if ($type -eq 'custom') { $layouts.custom += $c; continue }
    if (-not $layouts[$type]) { $layouts[$type] = $c }
  }

  # 3. Importeer tees (uniek over alle layouts)
  $allTees = @{}
  foreach ($c in $club.courses) {
    foreach ($t in $c.tees) {
      if (-not $allTees.ContainsKey($t.tee_id)) { $allTees[$t.tee_id] = $t }
    }
  }
  $teeIds = @{}  # external_id → database UUID
  foreach ($key in $allTees.Keys) {
    $t = $allTees[$key]
    $result = Invoke-Upsert $teesUrl @{
      course_id   = $courseId
      external_id = $t.tee_id
      name        = $t.tee_name
    } "course_id=eq.$courseId&external_id=eq.$($t.tee_id)"
    if ($result) {
      $teeIds[$t.tee_id] = $result.id
      $stats.tees++
    } else {
      Write-Host "    Tee $($t.tee_id) mislukt" -ForegroundColor Yellow
      $stats.errors++
    }
  }

  # Bepaal default tee (laagste tee_id = dichtst bij geel/wit)
  $defaultTeeId = $null
  $defaultTeeKey = ($allTees.Keys | Sort-Object)[0]
  if ($defaultTeeKey -and $teeIds.ContainsKey($defaultTeeKey)) {
    $defaultTeeId = $teeIds[$defaultTeeKey]
  }

  # 4. Importeer holes
  #    Haal holes uit full_18 als beschikbaar, anders front+back
  $holeSources = @()  # array van { startNumber, POS-offset, holes[] }
  if ($layouts.full_18) {
    $tee = $layouts.full_18.tees[0]
    if ($tee) { $holeSources += @{ offset = 0; holes = $tee.holes } }
  } else {
    if ($layouts.front_9 -and $layouts.front_9.tees[0]) {
      $holeSources += @{ offset = 0; holes = $layouts.front_9.tees[0].holes }
    }
    if ($layouts.back_9 -and $layouts.back_9.tees[0]) {
      $holeSources += @{ offset = 9; holes = $layouts.back_9.tees[0].holes }
    }
  }

  $holeIds = @{}  # hole position (1-18) → database UUID
  foreach ($source in $holeSources) {
    foreach ($holeObj in $source.holes) {
      $holeProp = $holeObj.PSObject.Properties | Select-Object -First 1
      $holeData = $holeProp.Value
      $pos = [int]$holeData.POS
      $number = $pos + $source.offset
      $par = [int]$holeData.PAR
      $si = [int]$holeData.SI

      if ($par -lt 3 -or $par -gt 5 -or $si -lt 1 -or $si -gt 18) { continue }

      $result = Invoke-Upsert $holesUrl @{
        course_id    = $courseId
        number       = $number
        par          = $par
        stroke_index = $si
      } "course_id=eq.$courseId&number=eq.$number"
      if ($result) {
        $holeIds[$number] = $result.id
        $stats.holes++
      }
    }
  }

  # 5. Maak loops en loop_holes
  $loopDefs = @()

  # Helper om loop holes te bepalen
  function Get-HoleNumbers($type, $hasFull18) {
    if ($type -eq 'full_18') { return @(1..18) }
    if ($type -eq 'front_9') { return @(1..9) }
    if ($type -eq 'back_9')  { return @(10..18) }
    return @()
  }

  $loopConfigs = @()
  $existingHoles = $holeIds.Keys | Sort-Object

  # Bepaal welke loops aangemaakt moeten worden
  if ($existingHoles -contains 18) {
    $loopConfigs += @{ type = 'full_18'; name = '18 holes'; holes = (1..18) }
  }
  if ($existingHoles -contains 9) {
    $loopConfigs += @{ type = 'front_9'; name = 'Voorste 9'; holes = (1..9) }
  }
  if ($existingHoles -contains 10) {
    $loopConfigs += @{ type = 'back_9'; name = 'Achterste 9'; holes = (10..18) }
  }

  # Custom layouts uit de JSON
  foreach ($c in $club.courses) {
    $type = Get-LoopType $c.course_name
    if ($type -ne 'custom') { continue }
    $tee = $c.tees[0]
    if (-not $tee) { continue }
    $holeNrs = @()
    foreach ($holeObj in $tee.holes) {
      $holeProp = $holeObj.PSObject.Properties | Select-Object -First 1
      $holeNrs += [int]$holeProp.Value.POS
    }
    $loopConfigs += @{ type = 'custom'; name = $c.course_name; holes = $holeNrs }
  }

  # Markeer eerste loop als default
  for ($i = 0; $i -lt $loopConfigs.Count; $i++) {
    $cfg = $loopConfigs[$i]
    $isDefault = ($i -eq 0)

    $loopResult = Invoke-Upsert $loopsUrl @{
      course_id   = $courseId
      name        = $cfg.name
      holes_count = $cfg.holes.Count
      loop_type   = $cfg.type
      tee_id      = $defaultTeeId
      is_default  = $isDefault
    } "course_id=eq.$courseId&name=eq.$($cfg.name)"
    if (-not $loopResult) {
      Write-Host "    Loop '$($cfg.name)' mislukt" -ForegroundColor Yellow
      $stats.errors++; continue
    }
    $loopId = $loopResult.id
    $stats.loops++

    # loop_holes
    $pos = 1
    foreach ($holeNr in $cfg.holes) {
      if (-not $holeIds.ContainsKey($holeNr)) {
        Write-Host "    Hole $holeNr niet gevonden in database" -ForegroundColor Yellow
        $pos++; continue
      }
      $holeId = $holeIds[$holeNr]
      $lhResult = Invoke-Upsert $loopHolesUrl @{
        loop_id  = $loopId
        hole_id  = $holeId
        tee_id   = $defaultTeeId
        position = $pos
      } "loop_id=eq.$loopId&position=eq.$pos"
      if ($lhResult) { $stats.loop_holes++ } else { $stats.errors++ }
      $pos++
    }

    Write-Host "    Loop: $($cfg.name) ($($cfg.holes.Count) holes)" -ForegroundColor Green
  }
}

Write-Host "`n" + ("=" * 50)
Write-Host "Import voltooid:" -ForegroundColor Green
Write-Host "  Courses:   $($stats.courses)"
Write-Host "  Tees:      $($stats.tees)"
Write-Host "  Holes:     $($stats.holes)"
Write-Host "  Loops:     $($stats.loops)"
Write-Host "  Loop holes: $($stats.loop_holes)"
if ($stats.errors -gt 0) { Write-Host "  Fouten:    $($stats.errors)" -ForegroundColor Yellow }
