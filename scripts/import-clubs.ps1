<#
.SYNOPSIS
  Importeert golfclubs uit een JSON-bestand naar Supabase (courses tabel).

.DESCRIPTION
  One-time import van een federatielijst (bv. uit eGolf4u export) naar de courses tabel.
  Gebruikt de Supabase REST API met service_role key.
  Veilig opnieuw uit te voeren (upsert op external_id).

.VEREISTEN
  - apps/web/.env.local met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY
  - JSON bestand met club objects (velden: id, naam, provincie, landcode, verwijderd)

.VOORBEELD
  .\scripts\import-clubs.ps1 -JsonPad .\data\clubs.json
#>

param(
  [Parameter(Mandatory)]
  [string]$JsonPad
)

# Laad .env.local
$envLines = Get-Content "$PSScriptRoot\..\apps\web\.env.local"
$envHash = @{}
foreach ($line in $envLines) {
  if ($line -match '^([^=]+)=(.*)') { $envHash[$Matches[1]] = $Matches[2] }
}
$supabaseUrl = $envHash['NEXT_PUBLIC_SUPABASE_URL']
$serviceRoleKey = $envHash['SUPABASE_SERVICE_ROLE_KEY']

if (-not $supabaseUrl -or -not $serviceRoleKey) {
  Write-Error "❌ Ontbrekende variabelen in apps/web/.env.local (NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY)"
  exit 1
}

$coursesUrl = "$supabaseUrl/rest/v1/courses"

# Lees JSON
if (-not (Test-Path $JsonPad)) {
  Write-Error "❌ Bestand niet gevonden: $JsonPad"
  exit 1
}

$clubs = Get-Content $JsonPad -Raw | ConvertFrom-Json
if ($clubs -isnot [array]) { $clubs = @($clubs) }

Write-Host "🏌️  $($clubs.Count) club(s) gevonden in $JsonPad"
Write-Host ""

$imported = 0
$errors = 0
$skipped = 0

foreach ($club in $clubs) {
  if ($club.verwijderd -eq 'j') {
    $skipped++
    continue
  }

  $headers = @{
    apikey        = $serviceRoleKey
    Authorization = "Bearer $serviceRoleKey"
  }

  # Check of deze club al bestaat (via external_id)
  $existing = $null
  try {
    $existing = Invoke-RestMethod -Uri "$coursesUrl`?external_id=eq.$($club.id)&select=id" -Method Get -Headers $headers -ErrorAction Stop
  } catch {}

  $row = @{
    name        = $club.naam
    location    = if ($club.provincie) { $club.provincie } else { $null }
    country     = if ($club.landcode) { $club.landcode.ToUpper() } else { 'NL' }
    holes_count = 18
    source      = 'egolf4u'
    external_id = $club.id
    is_verified = $true
  }

  try {
    if ($existing -and $existing.Count -gt 0) {
      # Bestaande rij updaten
      $id = $existing[0].id
      $null = Invoke-RestMethod -Uri "$coursesUrl`?id=eq.$id" -Method Patch -Body ($row | ConvertTo-Json -Compress) -ContentType "application/json" -Headers $headers -ErrorAction Stop
    } else {
      # Nieuwe rij invoegen
      $null = Invoke-RestMethod -Uri $coursesUrl -Method Post -Body (@($row) | ConvertTo-Json -Compress) -ContentType "application/json" -Headers $headers -ErrorAction Stop
    }

    Write-Host "  ✅ $($club.naam) ($(if ($club.provincie) { $club.provincie } else { 'onbekend' }))" -ForegroundColor Green
    $imported++
  } catch {
    $msg = $_.Exception.Message
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $reader.BaseStream.Position = 0
      $reader.DiscardBufferedData()
      $body = $reader.ReadToEnd()
      $msg = $body
    } catch {}
    Write-Host "  ❌ $($club.naam): $msg" -ForegroundColor Red
    $errors++
  }
}

Write-Host ""
Write-Host ("═" * 50)
Write-Host "✅ Import voltooid:" -ForegroundColor Green
Write-Host "   Geïmporteerd:  $imported"
Write-Host "   Overgeslagen:  $skipped (verwijderd)"
if ($errors -gt 0) { Write-Host "   Fouten:        $errors" -ForegroundColor Red }
