<#
.SYNOPSIS
  Importeert tees, holes, loops en loop_holes uit eGolf4u JSON naar Supabase.

.NOTES
  holes in de JSON komt in twee vormen voor:
    - Array: [{"h1":{PAR,SI,POS}}, {"h2":{...}}]
    - Object: {"h1":{PAR,SI,POS}, "h2":{...}}
  Beide worden ondersteund.

  Elke club (via import-clubs.ps1) is al een course in de database.
  Dit script importeert de detaildata: tees, holes, loops, loop_holes.
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
$ct = "application/json; charset=utf-8"

$u = @{
  courses    = "$supabaseUrl/rest/v1/courses"
  tees       = "$supabaseUrl/rest/v1/tees"
  holes      = "$supabaseUrl/rest/v1/holes"
  loops      = "$supabaseUrl/rest/v1/loops"
  loop_holes = "$supabaseUrl/rest/v1/loop_holes"
}

# === Lees JSON ===
if (-not (Test-Path $JsonPad)) { Write-Error "Bestand niet gevonden: $JsonPad"; exit 1 }
$clubs = Get-Content $JsonPad -Raw -Encoding UTF8 | ConvertFrom-Json
if ($clubs -isnot [array]) { $clubs = @($clubs) }

$s = @{ tees = 0; holes = 0; loops = 0; loop_holes = 0; errors = 0; skipped = 0 }

# === Helpers ===

function Invoke-Upsert($url, $row, $lookup) {
  try {
    $body = @($row) | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType $ct -Headers $headers -ErrorAction Stop
    return @{ id = $r[0].id; created = $true }
  } catch {
    if (-not $lookup) { return $null }
    try {
      $existing = Invoke-RestMethod -Uri "$url`?$lookup&select=id" -Method Get -Headers $headers -ErrorAction Stop
      if ($existing -and $existing.Count -gt 0) {
        $id = $existing[0].id
        $body = @($row) | ConvertTo-Json -Compress
        $null = Invoke-RestMethod -Uri "$url`?id=eq.$id" -Method Patch -Body $body -ContentType $ct -Headers $headers -ErrorAction Stop
        return @{ id = $id; created = $false }
      }
    } catch {}
    return $null
  }
}

# Normaliseer tee.holes naar array van {PAR,SI,POS,...} (ongeacht JSON formaat)
function Get-HoleDataArray($holes) {
  $result = @()
  if (-not $holes) { return $result }
  if ($holes -is [array]) {
    foreach ($h in $holes) {
      $prop = $h.PSObject.Properties | Select-Object -First 1
      if ($prop) { $result += $prop.Value }
    }
  } else {
    foreach ($prop in $holes.PSObject.Properties) {
      $result += $prop.Value
    }
  }
  return $result
}

# Bepaal loop-type op basis van layout-naam
function Get-LoopType($name) {
  if ($name -match '\b18\b|18.?holes') { return 'full_18' }
  if ($name -match '^1[eE]\b|voorste|^voor-|front') { return 'front_9' }
  if ($name -match '^2[eE]\b|achterste|^achter-|back') { return 'back_9' }
  return 'custom'
}

# Bepaal of een layout-naam naar een standaard 9-holes lus verwijst
function Is-StandardLoop($name) {
  return ($name -match '\b18\b|18.?holes|^1[eE]\b|^2[eE]\b|voorste|achterste|front|back')
}

Write-Host "`n$($clubs.Count) club(s) gevonden`n"

foreach ($club in $clubs) {
  Write-Host "  $($club.club_name) ($($club.courses.Count) layout(s))" -ForegroundColor Cyan

  # 1. Vind bestaande course (club) — overgeslagen als niet gevonden
  $courseRow = $null
  try { $courseRow = Invoke-RestMethod -Uri "$($u.courses)?external_id=eq.$($club.club_id)&select=id" -Method Get -Headers $headers -ErrorAction Stop } catch {}
  if (-not $courseRow -or $courseRow.Count -eq 0) {
    Write-Host "    Geen course gevonden met external_id=$($club.club_id), overslaan" -ForegroundColor Yellow
    $s.skipped++; continue
  }
  $courseId = $courseRow[0].id

  # 2. Importeer tees (uniek over alle layouts)
  $allTees = @{}
  foreach ($c in $club.courses) {
    foreach ($t in $c.tees) {
      if (-not $allTees.ContainsKey($t.tee_id)) { $allTees[$t.tee_id] = $t }
    }
  }
  $teeIds = @{}
  foreach ($key in $allTees.Keys) {
    $t = $allTees[$key]
    $r = Invoke-Upsert $u.tees @{ course_id=$courseId; external_id=$t.tee_id; name=$t.tee_name } "course_id=eq.$courseId&external_id=eq.$($t.tee_id)"
    if ($r) { $teeIds[$t.tee_id] = $r.id; $s.tees++ } else { $s.errors++ }
  }

  # Default tee = laagste tee_id (dichtst bij geel/wit)
  $defaultTeeId = $null
  if ($teeIds.Keys -and $teeIds.Keys.Count -gt 0) {
    $sorted = @($teeIds.Keys) | Sort-Object
    $defaultTeeId = $teeIds[$sorted[0]]
  }

  # 3. Verzamel alle hole data uit ALLE layouts
  #    Elke entry: { number, par, si, sourceLayout }
  $allHoleData = @{}  # key = holeNumber
  $layoutHoles = @{}  # key = course_id+"|"+course_name → array van posities

  foreach ($c in $club.courses) {
    $type = Get-LoopType $c.course_name
    $offset = if ($type -eq 'back_9') { 9 } else { 0 }
    $tee = $c.tees[0]
    if (-not $tee) { continue }

    $holeDataArray = Get-HoleDataArray $tee.holes
    $positions = @()

    foreach ($hd in $holeDataArray) {
      $pos = [int]$hd.POS
      $number = $pos + $offset
      $par = [int]$hd.PAR
      $si = [int]$hd.SI
      if ($par -lt 3 -or $par -gt 5 -or $si -lt 1 -or $si -gt 18) { continue }

      $positions += $number
      if (-not $allHoleData.ContainsKey($number)) {
        $allHoleData[$number] = @{ par = $par; si = $si }
      }
    }
    $layoutHoles["$($c.course_id)|$($c.course_name)"] = @{ type = $type; name = $c.course_name; positions = $positions; offset = $offset }
  }

  # 4. Importeer holes
  $holeIds = @{}
  foreach ($num in ($allHoleData.Keys | Sort-Object)) {
    $hd = $allHoleData[$num]
    $r = Invoke-Upsert $u.holes @{ course_id=$courseId; number=$num; par=$hd.par; stroke_index=$hd.si } "course_id=eq.$courseId&number=eq.$num"
    if ($r) { $holeIds[$num] = $r.id; $s.holes++ } else { $s.errors++ }
  }

  # 5. Maak loops + loop_holes
  $stdCreated = @{}  # track welke standaard loops al zijn aangemaakt
  $defaultLoopSet = $false

  foreach ($key in $layoutHoles.Keys) {
    $lh = $layoutHoles[$key]
    $type = $lh.type
    $posList = $lh.positions

    if ($type -ne 'custom') {
      # Sla standaard loop over als er al een van dit type is gemaakt
      if ($stdCreated.ContainsKey($type)) { continue }
      $stdCreated[$type] = $true
    }

    # Alleen loops aanmaken als er holes zijn
    if ($posList.Count -eq 0) { continue }

    $isDefault = (-not $defaultLoopSet) -and ($type -in ('full_18','front_9','back_9'))
    if ($isDefault) { $defaultLoopSet = $true }

    $loopResult = Invoke-Upsert $u.loops @{
      course_id   = $courseId
      name        = $lh.name
      holes_count = $posList.Count
      loop_type   = $type
      tee_id      = $defaultTeeId
      is_default  = $isDefault
    } "course_id=eq.$courseId&name=eq.$($lh.name)"
    if (-not $loopResult) { $s.errors++; continue }
    $loopId = $loopResult.id
    $s.loops++

    $pos = 1
    foreach ($holeNum in $posList) {
      if (-not $holeIds.ContainsKey($holeNum)) {
        $pos++; continue
      }
      $r = Invoke-Upsert $u.loop_holes @{
        loop_id  = $loopId
        hole_id  = $holeIds[$holeNum]
        tee_id   = $defaultTeeId
        position = $pos
      } "loop_id=eq.$loopId&position=eq.$pos"
      if ($r) { $s.loop_holes++ } else { $s.errors++ }
      $pos++
    }
  }

  Write-Host "    T=$($teeIds.Count) H=$($holeIds.Count) L=$($layoutHoles.Count)" -ForegroundColor Green
}

Write-Host "`n" + ("=" * 50)
Write-Host "Import voltooid:" -ForegroundColor Green
Write-Host "  Courses gevonden: $($clubs.Count - $s.skipped)"
Write-Host "  Overgeslagen:     $($s.skipped) (geen course match)"
Write-Host "  Tees:             $($s.tees)"
Write-Host "  Holes:            $($s.holes)"
Write-Host "  Loops:            $($s.loops)"
Write-Host "  Loop holes:       $($s.loop_holes)"
if ($s.errors -gt 0) { Write-Host "  Fouten:           $($s.errors)" -ForegroundColor Yellow }
